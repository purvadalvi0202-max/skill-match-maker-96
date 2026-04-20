import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard';
import ResumeTable from '@/components/ResumeTable';
import { ScoreBarChart, StatusDoughnut } from '@/components/ScoreChart';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import ResumePreviewModal from '@/components/ResumePreviewModal';
import MiniChatbot from '@/components/MiniChatbot';
import { exportToCsv } from '@/lib/exportCsv';
import { Download, TriangleAlert as AlertTriangle, Trophy, Users, ChartBar as BarChart3 } from 'lucide-react';

interface Resume {
  id: string;
  name: string;
  skills: string | null;
  experience: string | null;
  education: string | null;
  projects: string | null;
  certifications: string | null;
  score: number | null;
  ats_score: number | null;
  status: string | null;
  ml_prediction: string | null;
  missing_skills: string | null;
  ai_feedback: string | null;
  raw_text: string | null;
  shortlisted: boolean;
  job_id: string;
  validation_status: string | null;
  preference_boost: number | null;
}

interface Job { id: string; job_name: string; description: string; }

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState('all');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [shortlistedOnly, setShortlistedOnly] = useState(false);
  const [showSuspicious, setShowSuspicious] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [jobsRes, resumesRes] = await Promise.all([
      supabase.from('jobs').select('id, job_name, description'),
      supabase.from('resumes').select('*').order('ats_score', { ascending: false }),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data);
    if (resumesRes.data) setResumes(resumesRes.data as any);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return resumes.filter(r => {
      if (selectedJob !== 'all' && r.job_id !== selectedJob) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (skillFilter && !(r.skills || '').toLowerCase().includes(skillFilter.toLowerCase())) return false;
      if ((r.ats_score ?? 0) < minScore) return false;
      if (shortlistedOnly && !r.shortlisted) return false;
      if (showSuspicious && r.validation_status !== 'suspicious') return false;
      return true;
    });
  }, [resumes, selectedJob, search, skillFilter, minScore, shortlistedOnly, showSuspicious]);

  const avgAts = filtered.length ? Math.round(filtered.reduce((s, r) => s + (r.ats_score ?? 0), 0) / filtered.length) : 0;
  const shortlistedCount = filtered.filter(r => r.shortlisted).length;
  const suspiciousCount = resumes.filter(r => r.validation_status === 'suspicious').length;
  const eligible = filtered.filter(r => r.status !== 'Poor' && (r.ats_score ?? 0) >= 40);
  const topCandidate = eligible.length
    ? [...eligible].sort((a, b) => (b.ats_score ?? 0) - (a.ats_score ?? 0))[0]
    : null;
  const previewResume = resumes.find(r => r.id === previewId) || null;
  const previewJob = previewResume ? jobs.find(j => j.id === previewResume.job_id) : null;

  const preferenceMap = useMemo(() => {
    const m: Record<string, 'none' | 'women' | 'men'> = {};
    resumes.forEach(r => {
      // Derive from preference_boost + gender_signal stored at analyze time.
      // Default 'none'; we store the explicit per-row preference in localStorage for instant edits.
      const stored = (typeof window !== 'undefined' ? localStorage.getItem(`pref-${r.id}`) : null) as
        | 'none' | 'women' | 'men' | null;
      m[r.id] = stored ?? 'none';
    });
    return m;
  }, [resumes]);

  const handlePreferenceChange = async (id: string, value: 'none' | 'women' | 'men') => {
    const target = resumes.find(r => r.id === id);
    if (!target) return;
    // Compute boost: +3 if matching gender signal else 0
    const sig = (target as any).gender_signal as string | null;
    let boost = 0;
    if (value === 'women' && sig === 'female') boost = 3;
    if (value === 'men' && sig === 'male') boost = 3;

    // Adjust ats_score: remove old boost, add new
    const oldBoost = target.preference_boost ?? 0;
    const newAts = Math.max(0, Math.min(100, (target.ats_score ?? 0) - oldBoost + boost));

    if (typeof window !== 'undefined') localStorage.setItem(`pref-${id}`, value);

    setResumes(prev => prev.map(r => r.id === id
      ? { ...r, preference_boost: boost, ats_score: newAts }
      : r));

    const { error } = await supabase
      .from('resumes')
      .update({ preference_boost: boost, ats_score: newAts })
      .eq('id', id);
    if (error) toast.error('Failed to update preference');
    else toast.success(`Preference: ${value === 'none' ? 'No preference' : value === 'women' ? 'Prefer Women' : 'Prefer Men'}`);
  };

  const toggleShortlist = async (id: string, value: boolean) => {
    setResumes(prev => prev.map(r => r.id === id ? { ...r, shortlisted: value } : r));
    const { error } = await supabase.from('resumes').update({ shortlisted: value }).eq('id', id);
    if (error) toast.error('Failed to update shortlist');
    else toast.success(value ? 'Added to shortlist' : 'Removed from shortlist');
  };

  const deleteResume = async (id: string) => {
    const target = resumes.find(r => r.id === id);
    if (!confirm(`Delete resume "${target?.name ?? ''}"? This cannot be undone.`)) return;
    const prev = resumes;
    setResumes(p => p.filter(r => r.id !== id));
    const { error } = await supabase.from('resumes').delete().eq('id', id);
    if (error) {
      setResumes(prev);
      toast.error('Failed to delete resume');
    } else {
      toast.success('Resume deleted');
    }
  };

  const handleExport = () => {
    if (!filtered.length) return toast.error('Nothing to export');
    exportToCsv('resume-results.csv', filtered.map(r => ({
      name: r.name,
      ats_score: r.ats_score,
      score: r.score,
      status: r.status,
      ml_prediction: r.ml_prediction,
      shortlisted: r.shortlisted ? 'Yes' : 'No',
      skills: r.skills,
      projects: r.projects,
      certifications: r.certifications,
      missing_skills: r.missing_skills,
      experience: r.experience,
      education: r.education,
      validation_status: r.validation_status,
    })));
    toast.success('Exported CSV');
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-heading font-bold">Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">Overview of your candidate pipeline</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExport} className="rounded-xl gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-[220px] rounded-xl"><SelectValue placeholder="Filter by job" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.job_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Resumes" value={filtered.length} icon={<BarChart3 className="h-6 w-6" />} />
          <StatCard title="Shortlisted" value={shortlistedCount} icon={<span className="text-xl font-bold">★</span>} />
          <StatCard title="Avg ATS Score" value={`${avgAts}%`} icon={<span className="text-xl font-bold">%</span>} />
          <StatCard title="Top Candidate" value={topCandidate ? topCandidate.name.split(' - ')[0] || topCandidate.name : '—'} icon={<Trophy className="h-6 w-6" />} accent />
        </div>

        {suspiciousCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 mb-6 border-l-4 border-warning bg-warning/5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="font-semibold text-sm">{suspiciousCount} Suspicious Resume{suspiciousCount > 1 ? 's' : ''} Detected</p>
                <p className="text-xs text-muted-foreground">These resumes may contain placeholder text or insufficient content.</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSuspicious(v => !v)}
              className="rounded-xl shrink-0 border-warning/50 text-warning hover:bg-warning/10"
            >
              {showSuspicious ? 'Show All' : 'View Flagged'}
            </Button>
          </motion.div>
        )}

        <div className="glass-card rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">Filters apply automatically as you type</p>
            {(search || skillFilter || minScore > 0 || shortlistedOnly) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setSkillFilter(''); setMinScore(0); setShortlistedOnly(false); setShowSuspicious(false); }} className="rounded-lg text-xs h-7">
                Clear filters
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs">Search candidate</Label>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name..." className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs">Filter by skill</Label>
              <Input value={skillFilter} onChange={e => setSkillFilter(e.target.value)} placeholder="e.g. java, react" className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs">Min ATS score: {minScore}%</Label>
              <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)} className="w-full mt-3 accent-primary" />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={shortlistedOnly} onCheckedChange={setShortlistedOnly} id="short" />
              <Label htmlFor="short">Shortlisted only</Label>
            </div>
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ScoreBarChart resumes={filtered.map(r => ({ name: r.name, score: r.ats_score, status: r.status }))} />
            <StatusDoughnut resumes={filtered.map(r => ({ name: r.name, score: r.ats_score, status: r.status }))} />
          </div>
        )}

        {topCandidate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 mb-6 border border-primary/20 bg-primary/3"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Top Candidate</p>
                <p className="font-heading font-bold text-lg">{topCandidate.name}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge className="bg-success/10 text-success border-success/30 text-sm font-bold px-3">ATS {topCandidate.ats_score}%</Badge>
                <Badge variant={topCandidate.ml_prediction === 'Suitable' ? 'default' : 'secondary'}>{topCandidate.ml_prediction}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(topCandidate.skills || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 6).map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
              ))}
              {topCandidate.certifications && (
                <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">Certified</Badge>
              )}
              {topCandidate.projects && (
                <Badge variant="outline" className="text-xs bg-accent/10 text-accent-foreground border-accent/20">Has Projects</Badge>
              )}
            </div>
          </motion.div>
        )}

        <ResumeTable
          resumes={filtered}
          topCandidateId={topCandidate?.id}
          onView={setPreviewId}
          onShortlistToggle={toggleShortlist}
          onDelete={deleteResume}
          preferenceMap={preferenceMap}
          onPreferenceChange={handlePreferenceChange}
        />
      </motion.div>

      <ResumePreviewModal
        resume={previewResume}
        jobDescription={previewJob?.description}
        onClose={() => setPreviewId(null)}
        onUpdated={(r) => setResumes(prev => prev.map(x => x.id === r.id ? { ...x, ai_feedback: r.ai_feedback } : x))}
      />

      <MiniChatbot />
    </div>
  );
}
