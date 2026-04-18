import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Pencil, Trash2 } from 'lucide-react';

interface Job { id: string; job_name: string; description: string; created_at: string; }

export default function JobsPage() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Job | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (data) setJobs(data);
    setLoading(false);
  };

  const save = async () => {
    if (!name.trim() || !desc.trim()) return toast.error('Fill in name and description');
    if (editing) {
      const { error } = await supabase.from('jobs').update({ job_name: name, description: desc }).eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('Job updated');
    } else {
      const { error } = await supabase.from('jobs').insert({ job_name: name, description: desc, user_id: user!.id });
      if (error) return toast.error(error.message);
      toast.success('Job created');
    }
    setEditing(null); setName(''); setDesc('');
    fetch();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this job and all its resumes?')) return;
    await supabase.from('resumes').delete().eq('job_id', id);
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Job deleted');
    fetch();
  };

  const startEdit = (j: Job) => { setEditing(j); setName(j.job_name); setDesc(j.description); };
  const cancel = () => { setEditing(null); setName(''); setDesc(''); };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h2 className="text-3xl font-heading font-bold">Job Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Create and manage open positions</p>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            {editing ? 'Edit Job' : 'Create New Job'}
          </h3>
          <div className="space-y-3">
            <div>
              <Label>Job Title</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Senior Java Backend Developer" className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Description (include required skills, experience, education)</Label>
              <Textarea value={desc} onChange={e => setDesc(e.target.value)} className="rounded-xl mt-1 min-h-[140px]" placeholder="Skills: Java, Spring Boot, REST, SQL..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} className="rounded-xl gradient-primary text-primary-foreground border-0">{editing ? 'Update' : 'Create'} Job</Button>
              {editing && <Button variant="outline" onClick={cancel} className="rounded-xl">Cancel</Button>}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {jobs.map(j => (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -2 }}
                  className="glass-card rounded-2xl p-5 flex items-start justify-between gap-4 transition-shadow hover:shadow-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-semibold">{j.job_name}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{j.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => startEdit(j)} className="rounded-xl gap-1.5">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="destructive" onClick={() => remove(j.id)} className="rounded-xl gap-1.5">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {jobs.length === 0 && <p className="text-center text-muted-foreground py-12">No jobs yet — create your first one above.</p>}
          </div>
        )}
      </motion.div>
    </div>
  );
}
