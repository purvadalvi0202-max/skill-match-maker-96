import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractTextFromFile, SAMPLE_RESUMES } from '@/lib/resumeParser';
import { analyzeResume } from '@/lib/nlp';
import { UploadCloud, FileText, X, Search, Sparkles } from 'lucide-react';

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<{ id: string; job_name: string }[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [newJobName, setNewJobName] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [showNewJob, setShowNewJob] = useState(false);

  useEffect(() => { fetchJobs(); }, []);

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
    setNewJobName(''); setNewJobDesc(''); setShowNewJob(false);
    toast.success('Job created!');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const runAnalysis = async (items: { name: string; text: string }[]) => {
    if (!selectedJob) return toast.error('Select a job first');
    setAnalyzing(true); setProgress(0);

    const { data: jobData } = await supabase.from('jobs').select('description').eq('id', selectedJob).single();
    if (!jobData) { setAnalyzing(false); return toast.error('Job not found'); }

    const rows = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      setProgressLabel(`Analyzing ${it.name}...`);
      const result = analyzeResume(it.text, it.name, jobData.description);
      rows.push({
        user_id: user!.id,
        job_id: selectedJob,
        name: result.name,
        skills: result.skills,
        experience: result.experience,
        education: result.education,
        score: result.score,
        ats_score: result.atsScore,
        status: result.status,
        ml_prediction: result.mlPrediction,
        missing_skills: result.missingSkills,
        raw_text: result.rawText,
      });
      setProgress(Math.round(((i + 1) / items.length) * 100));
    }

    const { error } = await supabase.from('resumes').insert(rows);
    setAnalyzing(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} resume(s) analyzed!`);
    navigate('/dashboard');
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return toast.error('Upload at least one resume');
    setAnalyzing(true); setProgressLabel('Reading files...');
    const items = await Promise.all(files.map(async f => ({ name: f.name, text: await extractTextFromFile(f) })));
    await runAnalysis(items);
    setFiles([]);
  };

  const handleDemoAnalyze = () => runAnalysis(SAMPLE_RESUMES.map(s => ({ name: s.name, text: s.text })));

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-bold">Upload & Analyze</h2>
          <p className="text-sm text-muted-foreground mt-1">Drop resumes, pick a job, and let AI score them.</p>
        </div>

        {analyzing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 mb-6"
          >
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" /> {progressLabel}
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
          </motion.div>
        )}

        <div className="glass-card rounded-2xl p-6 mb-6">
          <Label className="text-base font-heading font-semibold">Select Job Position</Label>
          <div className="flex gap-3 mt-3">
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="rounded-xl flex-1"><SelectValue placeholder="Choose a job..." /></SelectTrigger>
              <SelectContent>
                {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.job_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowNewJob(!showNewJob)} className="rounded-xl">
              {showNewJob ? 'Cancel' : '+ New Job'}
            </Button>
          </div>

          <AnimatePresence>
            {showNewJob && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 space-y-3 overflow-hidden"
              >
                <Input placeholder="Job title" value={newJobName} onChange={e => setNewJobName(e.target.value)} className="rounded-xl" />
                <Textarea placeholder="Job description with required skills, experience, education..." value={newJobDesc} onChange={e => setNewJobDesc(e.target.value)} className="rounded-xl min-h-[120px]" />
                <Button onClick={handleCreateJob} className="rounded-xl gradient-primary text-primary-foreground border-0">Create Job</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <Label className="text-base font-heading font-semibold">Bulk Upload Resumes</Label>
          <motion.div
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            animate={{ scale: dragActive ? 1.02 : 1 }}
            className={`mt-3 border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <UploadCloud className="h-12 w-12 mx-auto text-primary mb-3" />
            <p className="font-medium">Drag & drop resumes here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse multiple .txt / .pdf files</p>
            <input id="file-input" type="file" multiple accept=".txt,.pdf" className="hidden" onChange={handleFileChange} />
          </motion.div>
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <motion.div
                    key={f.name + i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm truncate">{f.name}</span>
                    </div>
                    <button
                      onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleAnalyze} className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground border-0 text-base gap-2" disabled={!selectedJob || files.length === 0 || analyzing}>
            <Search className="h-4 w-4" /> Analyze {files.length} Resume{files.length !== 1 ? 's' : ''}
          </Button>
          <Button variant="outline" onClick={handleDemoAnalyze} className="flex-1 h-12 rounded-xl text-base gap-2" disabled={!selectedJob || analyzing}>
            <Sparkles className="h-4 w-4" /> Run Demo Analysis
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
