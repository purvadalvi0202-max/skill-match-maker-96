import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard';
import ResumeTable from '@/components/ResumeTable';
import { ScoreBarChart, StatusDoughnut } from '@/components/ScoreChart';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import ResumePreviewModal from '@/components/ResumePreviewModal';
import { exportToCsv } from '@/lib/exportCsv';
import { Download, Search, Wrench, X } from 'lucide-react';

interface Resume {
  id: string;
  name: string;
  skills: string | null;
  experience: string | null;
  education: string | null;
  score: number | null;
  ats_score: number | null;
  status: string | null;
  ml_prediction: string | null;
  missing_skills: string | null;
  ai_feedback: string | null;
  raw_text: string | null;
  shortlisted: boolean;
  job_id: string;
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
      return true;
    });
  }, [resumes, selectedJob, search, skillFilter, minScore, shortlistedOnly]);

  const avgAts = filtered.length ? Math.round(filtered.reduce((s, r) => s + (r.ats_score ?? 0), 0) / filtered.length) : 0;
  const shortlistedCount = filtered.filter(r => r.shortlisted).length;
  // Top candidate: best ATS score among non-Poor candidates; fallback to none if all are Poor
  const eligible = filtered.filter(r => r.status !== 'Poor' && (r.ats_score ?? 0) >= 50);
  const topCandidate = eligible.length
    ? [...eligible].sort((a, b) => (b.ats_score ?? 0) - (a.ats_score ?? 0))[0]
    : null;
  const previewResume = resumes.find(r => r.id === previewId) || null;
  const previewJob = previewResume ? jobs.find(j => j.id === previewResume.job_id) : null;

  const toggleShortlist = async (id: string, value: boolean) => {
    setResumes(prev => prev.map(r => r.id === id ? { ...r, shortlisted: value } : r));
    const { error } = await supabase.from('resumes').update({ shortlisted: value }).eq('id', id);
    if (error) toast.error('Failed to update shortlist');
    else toast.success(value ? 'Added to shortlist' : 'Removed from shortlist');
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
      missing_skills: r.missing_skills,
      experience: r.experience,
      education: r.education,
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
          <div className="flex gap-2">
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

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Resumes" value={filtered.length} icon={<span className="text-xl">📄</span>} />
            <StatCard title="Shortlisted" value={shortlistedCount} icon={<span className="text-xl">⭐</span>} />
            <StatCard title="Avg ATS Score" value={`${avgAts}%`} icon={<span className="text-xl">📊</span>} />
            <StatCard title="Top Candidate" value={topCandidate ? topCandidate.name.split(' - ')[0] || topCandidate.name : '—'} icon={<span className="text-xl">🏆</span>} accent />
          </div>

          {/* Filters */}
          <div className="glass-card rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">🔎 Filters apply automatically as you type</p>
              {(search || skillFilter || minScore > 0 || shortlistedOnly) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearch(''); setSkillFilter(''); setMinScore(0); setShortlistedOnly(false); }}
                  className="rounded-lg text-xs h-7"
                >
                  ✕ Clear filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <Label className="text-xs">Search candidate</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name..." className="rounded-xl pl-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Filter by skill</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🛠️</span>
                  <Input value={skillFilter} onChange={e => setSkillFilter(e.target.value)} placeholder="e.g. java, react" className="rounded-xl pl-9" />
                </div>
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

          {/* Charts */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ScoreBarChart resumes={filtered.map(r => ({ name: r.name, score: r.ats_score, status: r.status }))} />
              <StatusDoughnut resumes={filtered.map(r => ({ name: r.name, score: r.ats_score, status: r.status }))} />
            </div>
          )}

          <ResumeTable
            resumes={filtered}
            topCandidateId={topCandidate?.id}
            onView={setPreviewId}
            onShortlistToggle={toggleShortlist}
          />
        </motion.div>
      </div>

      <ResumePreviewModal
        resume={previewResume}
        jobDescription={previewJob?.description}
        onClose={() => setPreviewId(null)}
        onUpdated={(r) => setResumes(prev => prev.map(x => x.id === r.id ? { ...x, ai_feedback: r.ai_feedback } : x))}
      />
    </div>
  );
}
