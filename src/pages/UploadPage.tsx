import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractTextFromFile, SAMPLE_RESUMES } from '@/lib/resumeParser';
import { analyzeResume } from '@/lib/nlp';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function UploadPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<{ id: string; job_name: string }[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [newJobName, setNewJobName] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showNewJob, setShowNewJob] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data } = await supabase.from('jobs').select('id, job_name');
    if (data) setJobs(data);
  };

  const handleCreateJob = async () => {
    if (!newJobName || !newJobDesc) return toast.error('Fill in job name and description');
    const { data, error } = await supabase.from('jobs').insert({
      job_name: newJobName, description: newJobDesc, user_id: user!.id
    }).select('id, job_name').single();
    if (error) return toast.error(error.message);
    setJobs(prev => [...prev, data]);
    setSelectedJob(data.id);
    setNewJobName('');
    setNewJobDesc('');
    setShowNewJob(false);
    toast.success('Job created!');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleAnalyze = async () => {
    if (!selectedJob) return toast.error('Select a job first');
    if (files.length === 0) return toast.error('Upload at least one resume');

    setAnalyzing(true);
    const { data: jobData } = await supabase.from('jobs').select('description').eq('id', selectedJob).single();
    if (!jobData) { setAnalyzing(false); return toast.error('Job not found'); }

    for (const file of files) {
      const text = await extractTextFromFile(file);
      const result = analyzeResume(text, file.name, jobData.description);
      await supabase.from('resumes').insert({
        user_id: user!.id,
        job_id: selectedJob,
        name: result.name,
        skills: result.skills,
        experience: result.experience,
        education: result.education,
        score: result.score,
        status: result.status,
        ml_prediction: result.mlPrediction,
        raw_text: result.rawText,
      });
    }

    setAnalyzing(false);
    toast.success(`${files.length} resume(s) analyzed!`);
    navigate('/dashboard');
  };

  const handleDemoAnalyze = async () => {
    if (!selectedJob) return toast.error('Select a job first');
    setAnalyzing(true);

    const { data: jobData } = await supabase.from('jobs').select('description').eq('id', selectedJob).single();
    if (!jobData) { setAnalyzing(false); return toast.error('Job not found'); }

    for (const sample of SAMPLE_RESUMES) {
      const result = analyzeResume(sample.text, sample.name, jobData.description);
      await supabase.from('resumes').insert({
        user_id: user!.id,
        job_id: selectedJob,
        name: result.name,
        skills: result.skills,
        experience: result.experience,
        education: result.education,
        score: result.score,
        status: result.status,
        ml_prediction: result.mlPrediction,
        raw_text: result.rawText,
      });
    }

    setAnalyzing(false);
    toast.success('Demo resumes analyzed!');
    navigate('/dashboard');
  };

  if (analyzing) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner text="Analyzing resumes with AI..." />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <h1 className="text-xl font-heading font-bold text-gradient">Resume Screener</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="rounded-xl">Dashboard</Button>
            <Button variant="outline" onClick={signOut} className="rounded-xl">Logout</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl font-heading font-bold mb-8 text-foreground">Upload & Analyze</h2>

          {/* Job Selection */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <Label className="text-base font-heading font-semibold">Select Job Position</Label>
            <div className="flex gap-3 mt-3">
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="rounded-xl flex-1">
                  <SelectValue placeholder="Choose a job..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.job_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setShowNewJob(!showNewJob)} className="rounded-xl">
                {showNewJob ? 'Cancel' : '+ New Job'}
              </Button>
            </div>

            {showNewJob && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 space-y-3">
                <Input placeholder="Job title (e.g., Java Backend Developer)" value={newJobName} onChange={e => setNewJobName(e.target.value)} className="rounded-xl" />
                <Textarea placeholder="Job description with required skills, experience, education..." value={newJobDesc} onChange={e => setNewJobDesc(e.target.value)} className="rounded-xl min-h-[120px]" />
                <Button onClick={handleCreateJob} className="rounded-xl gradient-primary text-primary-foreground border-0 hover:opacity-90">Create Job</Button>
              </motion.div>
            )}
          </div>

          {/* File Upload */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <Label className="text-base font-heading font-semibold">Upload Resumes</Label>
            <div
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`mt-3 border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer
                ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="font-medium text-foreground">Drag & drop resumes here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse (.txt, .pdf)</p>
              <input id="file-input" type="file" multiple accept=".txt,.pdf" className="hidden" onChange={handleFileChange} />
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2">
                    <span className="text-sm text-foreground">{f.name}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive text-sm hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleAnalyze} className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground border-0 hover:opacity-90 text-base" disabled={!selectedJob || files.length === 0}>
              🔍 Analyze {files.length} Resume{files.length !== 1 ? 's' : ''}
            </Button>
            <Button variant="outline" onClick={handleDemoAnalyze} className="flex-1 h-12 rounded-xl text-base" disabled={!selectedJob}>
              🎯 Run Demo Analysis
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
