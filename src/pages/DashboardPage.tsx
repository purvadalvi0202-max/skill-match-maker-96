import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/StatCard';
import ResumeTable from '@/components/ResumeTable';
import { ScoreBarChart, StatusDoughnut } from '@/components/ScoreChart';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Resume {
  id: string;
  name: string;
  skills: string | null;
  experience: string | null;
  education: string | null;
  score: number | null;
  status: string | null;
  ml_prediction: string | null;
  job_id: string;
}

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<{ id: string; job_name: string }[]>([]);
  const [selectedJob, setSelectedJob] = useState('all');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [jobsRes, resumesRes] = await Promise.all([
      supabase.from('jobs').select('id, job_name'),
      supabase.from('resumes').select('id, name, skills, experience, education, score, status, ml_prediction, job_id'),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data);
    if (resumesRes.data) setResumes(resumesRes.data);
    setLoading(false);
  };

  const filtered = selectedJob === 'all' ? resumes : resumes.filter(r => r.job_id === selectedJob);
  const avgScore = filtered.length ? Math.round(filtered.reduce((s, r) => s + (r.score ?? 0), 0) / filtered.length) : 0;
  const topCandidate = filtered.length ? [...filtered].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] : null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner text="Loading dashboard..." />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <h1 className="text-xl font-heading font-bold text-gradient">Resume Screener</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/upload')} className="rounded-xl">Upload</Button>
            <Button variant="outline" onClick={signOut} className="rounded-xl">Logout</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <h2 className="text-3xl font-heading font-bold text-foreground">Dashboard</h2>
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-[220px] rounded-xl">
                <SelectValue placeholder="Filter by job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.job_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard title="Total Resumes" value={filtered.length} icon={<span className="text-xl">📄</span>} />
            <StatCard title="Average Score" value={`${avgScore}%`} icon={<span className="text-xl">📊</span>} />
            <StatCard
              title="Top Candidate"
              value={topCandidate ? topCandidate.name.split(' - ')[0] || topCandidate.name : '—'}
              icon={<span className="text-xl">🏆</span>}
              accent
            />
          </div>

          {/* Charts */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ScoreBarChart resumes={filtered} />
              <StatusDoughnut resumes={filtered} />
            </div>
          )}

          {/* Table */}
          <ResumeTable resumes={filtered} topCandidateId={topCandidate?.id} />
        </motion.div>
      </div>
    </div>
  );
}
