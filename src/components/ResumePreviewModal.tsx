import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LoadingSpinner from './LoadingSpinner';

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
  job_id: string;
}

interface Props {
  resume: Resume | null;
  jobDescription?: string;
  onClose: () => void;
  onUpdated: (r: Resume) => void;
}

export default function ResumePreviewModal({ resume, jobDescription, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => { setFeedback(resume?.ai_feedback ?? null); }, [resume]);

  if (!resume) return null;

  const generateFeedback = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('ai-feedback', {
      body: {
        candidateName: resume.name,
        jobDescription: jobDescription ?? '',
        skills: resume.skills,
        missingSkills: resume.missing_skills,
        experience: resume.experience,
        education: resume.education,
        atsScore: resume.ats_score ?? resume.score ?? 0,
      },
    });
    setLoading(false);
    if (error || !data?.feedback) {
      toast.error(data?.error || error?.message || 'Failed to generate feedback');
      return;
    }
    setFeedback(data.feedback);
    await supabase.from('resumes').update({ ai_feedback: data.feedback }).eq('id', resume.id);
    onUpdated({ ...resume, ai_feedback: data.feedback });
    toast.success('AI feedback generated');
  };

  const Chips = ({ items, variant = 'default' }: { items?: string | null; variant?: 'default' | 'destructive' }) => (
    <div className="flex flex-wrap gap-1.5">
      {(items || '').split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
        <Badge key={i} variant={variant === 'destructive' ? 'destructive' : 'secondary'}>{s}</Badge>
      )) || <span className="text-muted-foreground text-sm">—</span>}
    </div>
  );

  return (
    <Dialog open={!!resume} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{resume.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">ATS Score</p>
            <p className="text-2xl font-bold text-primary">{resume.ats_score ?? resume.score ?? 0}%</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-lg font-semibold">{resume.status || '—'}</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">ML</p>
            <p className="text-lg font-semibold">{resume.ml_prediction || '—'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-heading font-semibold mb-2">Skills</h4>
            <Chips items={resume.skills} />
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-2">Missing Skills</h4>
            {resume.missing_skills ? <Chips items={resume.missing_skills} variant="destructive" /> : <p className="text-sm text-muted-foreground">None — all required skills present.</p>}
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-2">Experience</h4>
            <Chips items={resume.experience} />
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-2">Education</h4>
            <Chips items={resume.education} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-heading font-semibold">AI Recruiter Feedback</h4>
              <Button size="sm" onClick={generateFeedback} disabled={loading} className="rounded-xl gradient-primary text-primary-foreground border-0">
                {loading ? 'Generating...' : feedback ? 'Regenerate' : 'Generate'}
              </Button>
            </div>
            {loading ? <LoadingSpinner text="Asking AI..." /> : feedback ? (
              <div className="bg-muted/40 rounded-xl p-4 text-sm whitespace-pre-wrap">{feedback}</div>
            ) : (
              <p className="text-sm text-muted-foreground">No feedback yet. Click Generate to get AI suggestions.</p>
            )}
          </div>

          {resume.raw_text && (
            <details>
              <summary className="cursor-pointer font-heading font-semibold">Raw Resume Text</summary>
              <pre className="bg-muted/40 rounded-xl p-4 mt-2 text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">{resume.raw_text}</pre>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
