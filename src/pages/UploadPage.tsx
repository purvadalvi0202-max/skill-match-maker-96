import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractTextFromFile, validateResumeFile, validateResumeContent, SAMPLE_RESUMES } from '@/lib/resumeParser';
import { analyzeResume } from '@/lib/nlp';
import { CloudUpload as UploadCloud, FileText, X, Search, Sparkles, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Users } from 'lucide-react';

type Preference = 'none' | 'women' | 'men';

interface ValidatedFile {
  file: File;
  valid: boolean;
  error?: string;
}

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<{ id: string; job_name: string }[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [newJobName, setNewJobName] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [validatedFiles, setValidatedFiles] = useState<ValidatedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [showNewJob, setShowNewJob] = useState(false);
  const [preference, setPreference] = useState<Preference>('none');

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

  const addFiles = useCallback((newFiles: File[]) => {
    const validated = newFiles.map(file => {
      const result = validateResumeFile(file);
      return { file, valid: result.valid, error: result.error };
    });
    validated.filter(v => !v.valid).forEach(v => toast.error(v.error || 'Invalid file'));
    const validOnes = validated.filter(v => v.valid);
    if (validOnes.length > 0) {
      setValidatedFiles(prev => {
        const existingNames = new Set(prev.map(f => f.file.name));
        return [...prev, ...validOnes.filter(v => !existingNames.has(v.file.name))];
      });
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
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
      const result = analyzeResume(it.text, it.name, jobData.description, preference);
      rows.push({
        user_id: user!.id,
        job_id: selectedJob,
        name: result.name,
        skills: result.skills,
        experience: result.experience,
        education: result.education,
        projects: result.projects,
        certifications: result.certifications,
        score: result.score,
        ats_score: result.atsScore,
        status: result.status,
        ml_prediction: result.mlPrediction,
        missing_skills: result.missingSkills,
        raw_text: result.rawText,
        validation_status: result.validationStatus,
        gender_signal: result.genderSignal,
        preference_boost: preference !== 'none' ? 3 : 0,
      });
      setProgress(Math.round(((i + 1) / items.length) * 100));
    }

    const suspicious = rows.filter(r => r.validation_status === 'suspicious');
    if (suspicious.length > 0) {
      toast.warning(`${suspicious.length} resume(s) flagged as suspicious.`);
    }

    const { error } = await supabase.from('resumes').insert(rows);
    setAnalyzing(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} resume(s) analyzed successfully!`);
    navigate('/dashboard');
  };

  const handleAnalyze = async () => {
    const validOnly = validatedFiles.filter(v => v.valid);
    if (validOnly.length === 0) return toast.error('Upload at least one valid resume');
    setAnalyzing(true); setProgressLabel('Reading & validating files...');
    const extracted = await Promise.all(
      validOnly.map(async v => ({ name: v.file.name, text: await extractTextFromFile(v.file) }))
    );

    // Content-based resume detection — reject reports, papers, assignments, etc.
    const accepted: { name: string; text: string }[] = [];
    const rejected: string[] = [];
    for (const it of extracted) {
      const check = validateResumeContent(it.text);
      if (check.isResume) {
        accepted.push(it);
      } else {
        rejected.push(it.name);
        toast.error(`${it.name}: ${check.reason}`, { duration: 6000 });
      }
    }

    if (accepted.length === 0) {
      setAnalyzing(false);
      setValidatedFiles(prev => prev.filter(v => !rejected.includes(v.file.name)));
      return toast.error('No valid resumes detected. Only actual CVs/Resumes are accepted.');
    }

    await runAnalysis(accepted);
    setValidatedFiles([]);
  };

  const handleDemoAnalyze = () => runAnalysis(SAMPLE_RESUMES.map(s => ({ name: s.name, text: s.text })));

  const validCount = validatedFiles.filter(v => v.valid).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-bold">Upload & Analyze</h2>
          <p className="text-sm text-muted-foreground mt-1">Drop resumes, pick a job, and let AI score them instantly.</p>
        </div>

        {analyzing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 mb-6">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" /> {progressLabel}
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
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
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 space-y-3 overflow-hidden">
                <Input placeholder="Job title" value={newJobName} onChange={e => setNewJobName(e.target.value)} className="rounded-xl" />
                <Textarea placeholder="Job description with required skills, experience, education, projects..." value={newJobDesc} onChange={e => setNewJobDesc(e.target.value)} className="rounded-xl min-h-[120px]" />
                <Button onClick={handleCreateJob} className="rounded-xl gradient-primary text-primary-foreground border-0">Create Job</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-primary" />
            <Label className="text-base font-heading font-semibold">Candidate Preference</Label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Applies a small +3 point ranking boost only. No candidates are filtered or excluded.</p>
          <Select value={preference} onValueChange={(v) => setPreference(v as Preference)}>
            <SelectTrigger className="rounded-xl w-full sm:w-64">
              <SelectValue placeholder="Select preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Preference</SelectItem>
              <SelectItem value="women">Prefer Women</SelectItem>
              <SelectItem value="men">Prefer Men</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-heading font-semibold">Bulk Upload Resumes</Label>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">PDF</Badge>
              <Badge variant="outline" className="text-xs">TXT</Badge>
              <span>only</span>
            </div>
          </div>

          <motion.div
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            animate={{ scale: dragActive ? 1.02 : 1 }}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <motion.div animate={{ y: dragActive ? -6 : 0 }} transition={{ type: 'spring', stiffness: 300 }}>
              <UploadCloud className={`h-12 w-12 mx-auto mb-3 transition-colors ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            </motion.div>
            <p className="font-semibold text-foreground">Drag & drop resumes here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse — PDF and TXT files only (max 5MB each)</p>
            <p className="text-xs text-destructive mt-2 font-medium">Word docs, images, and Excel files are automatically rejected</p>
            <input id="file-input" type="file" multiple accept=".txt,.pdf" className="hidden" onChange={handleFileChange} />
          </motion.div>

          <AnimatePresence>
            {validatedFiles.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-2">
                {validatedFiles.map((vf, i) => (
                  <motion.div
                    key={vf.file.name + i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`flex items-center justify-between rounded-xl px-4 py-2.5 border ${
                      vf.valid ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {vf.valid
                        ? <CheckCircle className="h-4 w-4 text-success shrink-0" />
                        : <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-sm truncate font-medium">{vf.file.name}</p>
                        {!vf.valid && <p className="text-xs text-destructive truncate">{vf.error}</p>}
                      </div>
                    </div>
                    <button onClick={() => setValidatedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-2">
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleAnalyze} className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground border-0 text-base gap-2" disabled={!selectedJob || validCount === 0 || analyzing}>
            <Search className="h-4 w-4" /> Analyze {validCount} Resume{validCount !== 1 ? 's' : ''}
          </Button>
          <Button variant="outline" onClick={handleDemoAnalyze} className="flex-1 h-12 rounded-xl text-base gap-2" disabled={!selectedJob || analyzing}>
            <Sparkles className="h-4 w-4" /> Run Demo Analysis
          </Button>
        </div>

        <div className="mt-5 glass-card rounded-xl p-4">
          <p className="text-xs font-heading font-semibold text-muted-foreground mb-2">ATS Scoring Weights</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              { label: 'Skills', pct: '40%', color: 'bg-primary/10 text-primary border-primary/20' },
              { label: 'Experience', pct: '20%', color: 'bg-accent/10 text-accent-foreground border-accent/20' },
              { label: 'Education', pct: '15%', color: 'bg-success/10 text-success border-success/20' },
              { label: 'Projects', pct: '15%', color: 'bg-warning/10 text-warning border-warning/20' },
              { label: 'Certifications', pct: '10%', color: 'bg-destructive/10 text-destructive border-destructive/20' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg px-2 py-1.5 text-center border ${s.color}`}>
                <p className="font-bold">{s.pct}</p>
                <p className="opacity-80 text-[10px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
