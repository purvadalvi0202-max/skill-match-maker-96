import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LoadingSpinner from './LoadingSpinner';
import CircularScore from './CircularScore';
import { ChipList } from './SkillChip';
import { TriangleAlert as AlertTriangle, FolderOpen, Award, CircleCheck as CheckCircle2, Briefcase, GraduationCap } from 'lucide-react';
import { safeParseArray, type ExperienceItem, type EducationItem, type ProjectItem, type CertificationItem } from '@/lib/nlp';

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
  job_id: string;
  validation_status: string | null;
  preference_boost: number | null;
}

interface Props {
  resume: Resume | null;
  jobDescription?: string;
  onClose: () => void;
  onUpdated: (r: Resume) => void;
}

interface JobSuggestion {
  title: string;
  level: string;
  match_percent: number;
  matching_skills: string[];
  why: string;
}

export default function ResumePreviewModal({ resume, jobDescription, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);

  useEffect(() => {
    setFeedback(resume?.ai_feedback ?? null);
    setSuggestions([]);
  }, [resume]);

  if (!resume) return null;

  const isSuspicious = resume.validation_status === 'suspicious';
  const experienceItems = safeParseArray<ExperienceItem>(resume.experience);
  const educationItems = safeParseArray<EducationItem>(resume.education);
  const projectItems = safeParseArray<ProjectItem>(resume.projects);
  const certItems = safeParseArray<CertificationItem>(resume.certifications);

  const isFresher = experienceItems.length === 0 && /\bfresher\b/i.test(resume.raw_text || '');
  const expValid = experienceItems.length > 0 && experienceItems.every(e => e.company && e.role && e.duration);
  const eduValid = educationItems.length > 0 && educationItems.every(e => e.degree && e.college);

  const ValidBadge = ({ ok, fresher }: { ok: boolean; fresher?: boolean }) => fresher ? (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] gap-1">
      <CheckCircle2 className="h-3 w-3" /> Fresher
    </Badge>
  ) : ok ? (
    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] gap-1">
      <CheckCircle2 className="h-3 w-3" /> Valid
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px] gap-1">
      <AlertTriangle className="h-3 w-3" /> Missing / Incomplete
    </Badge>
  );

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

  const generateSuggestions = async () => {
    setSuggesting(true);
    const { data, error } = await supabase.functions.invoke('job-suggestions', {
      body: {
        candidateName: resume.name,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
      },
    });
    setSuggesting(false);
    if (error || !data?.suggestions) {
      toast.error(data?.error || error?.message || 'Failed to fetch job suggestions');
      return;
    }
    setSuggestions(data.suggestions);
    toast.success(`Found ${data.suggestions.length} matching roles`);
  };

  const levelColor = (level: string) => {
    const l = level.toLowerCase();
    if (l === 'intern' || l === 'junior') return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (l === 'mid') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (l === 'senior') return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
    if (l === 'freelance') return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Dialog open={!!resume} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="font-heading text-2xl">{resume.name}</DialogTitle>
            {isSuspicious && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
                <AlertTriangle className="h-3 w-3" /> Suspicious
              </Badge>
            )}
            {resume.preference_boost && resume.preference_boost > 0 ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                +{resume.preference_boost} boost
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        {isSuspicious && (
          <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 flex items-start gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>This resume was flagged as suspicious. It may contain placeholder text, insufficient content, or keyboard-mashing patterns. Review carefully before shortlisting.</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="glass-card rounded-xl p-4 flex items-center justify-center">
            <CircularScore value={resume.ats_score ?? resume.score ?? 0} size={72} stroke={7} label="ATS" />
          </div>
          <div className="glass-card rounded-xl p-4 text-center flex flex-col justify-center">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-lg font-semibold mt-1">{resume.status || '—'}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center flex flex-col justify-center">
            <p className="text-xs text-muted-foreground">ML Prediction</p>
            <p className="text-lg font-semibold mt-1">{resume.ml_prediction || '—'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-heading font-semibold mb-2">Skills</h4>
            <ChipList items={resume.skills} />
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-2">Missing Skills</h4>
            {resume.missing_skills ? <ChipList items={resume.missing_skills} variant="destructive" /> : <p className="text-sm text-muted-foreground">None — all required skills present.</p>}
          </div>


          {/* Experience */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <h4 className="font-heading font-semibold">Experience</h4>
              <ValidBadge ok={expValid} fresher={isFresher} />
            </div>
            {isFresher ? (
              <p className="text-sm text-muted-foreground italic">Experience Level: Fresher</p>
            ) : experienceItems.length === 0 ? (
              <p className="text-sm text-warning">⚠ Incomplete experience details</p>
            ) : (
              <div className="space-y-2">
                {experienceItems.map((e, i) => {
                  const incomplete = !e.company || !e.role || !e.duration;
                  return (
                    <div key={i} className={`rounded-lg border p-3 text-sm ${incomplete ? 'border-warning/30 bg-warning/5' : 'border-border/50 bg-muted/30'}`}>
                      <div className="font-medium">{e.role || <span className="text-warning">Role missing</span>}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {e.company || <span className="text-warning">Company missing</span>} {' • '}
                        {e.duration || <span className="text-warning">Duration missing</span>}
                      </div>
                      {incomplete && <div className="text-xs text-warning mt-1">⚠ Incomplete experience details</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Education */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-4 w-4 text-success" />
              <h4 className="font-heading font-semibold">Education</h4>
              <ValidBadge ok={eduValid} />
            </div>
            {educationItems.length === 0 ? (
              <p className="text-sm text-warning">⚠ Incomplete education details</p>
            ) : (
              <div className="space-y-2">
                {educationItems.map((e, i) => {
                  const incomplete = !e.degree || !e.college;
                  return (
                    <div key={i} className={`rounded-lg border p-3 text-sm ${incomplete ? 'border-warning/30 bg-warning/5' : 'border-border/50 bg-muted/30'}`}>
                      <div className="font-medium">{e.degree || <span className="text-warning">Degree missing</span>}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{e.college || <span className="text-warning">College missing</span>}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Projects */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="h-4 w-4 text-accent-foreground" />
              <h4 className="font-heading font-semibold">Projects</h4>
              <ValidBadge ok={projectItems.length > 0} />
              {projectItems.length > 0 && (
                <Badge variant="outline" className="text-xs bg-accent/10 text-accent-foreground border-accent/20">{projectItems.length}</Badge>
              )}
            </div>
            {projectItems.length === 0 ? (
              <p className="text-sm text-warning">⚠ No valid projects found</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {projectItems.map((p, i) => (
                  <span key={i} className="inline-flex items-center rounded-lg border border-accent/20 bg-accent/10 text-accent-foreground px-2.5 py-1 text-xs font-medium">
                    {p.project_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Certifications */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-warning" />
              <h4 className="font-heading font-semibold">Certifications</h4>
              <ValidBadge ok={certItems.length > 0} />
              {certItems.length > 0 && (
                <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">{certItems.length}</Badge>
              )}
            </div>
            {certItems.length === 0 ? (
              <p className="text-sm text-warning">⚠ No certifications found</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {certItems.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-warning/20 bg-warning/10 text-warning px-2.5 py-1 text-xs font-medium">
                    <Award className="h-3 w-3" />{c.certification_name}
                  </span>
                ))}
              </div>
            )}
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-heading font-semibold">AI Job Suggestions</h4>
              <Button size="sm" onClick={generateSuggestions} disabled={suggesting} className="rounded-xl gradient-primary text-primary-foreground border-0">
                {suggesting ? 'Finding roles...' : suggestions.length ? 'Refresh' : 'Suggest Jobs'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Skills-first matching — formal education is NOT required. Great for students and self-taught candidates.
            </p>
            {suggesting ? <LoadingSpinner text="Finding best-fit roles..." /> : suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div key={i} className="glass-card rounded-xl p-4 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{s.title}</span>
                        <Badge variant="outline" className={levelColor(s.level)}>{s.level}</Badge>
                      </div>
                      <span className="text-primary font-bold text-lg">{s.match_percent}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{s.why}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(s.matching_skills || []).map((sk, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">{sk}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click "Suggest Jobs" to get AI-powered role recommendations based on this candidate's skills.</p>
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
