import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import CircularScore from './CircularScore';
import SkillChip from './SkillChip';
import { Eye, Star, Trophy, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
  shortlisted: boolean;
}

interface ResumeTableProps {
  resumes: Resume[];
  topCandidateId?: string;
  onView: (id: string) => void;
  onShortlistToggle: (id: string, value: boolean) => void;
}

type SortKey = 'name' | 'score' | 'ats_score' | 'status' | 'ml_prediction';

export default function ResumeTable({ resumes, topCandidateId, onView, onShortlistToggle }: ResumeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('ats_score');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...resumes].sort((a, b) => {
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    const cmp = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal));
    return sortAsc ? cmp : -cmp;
  });

  const statusColor = (s: string | null) => {
    if (s === 'Good') return 'bg-success/10 text-success border-success/30';
    if (s === 'Average') return 'bg-warning/10 text-warning border-warning/30';
    return 'bg-destructive/10 text-destructive border-destructive/30';
  };

  const SortIcon = ({ active, asc }: { active: boolean; asc: boolean }) => {
    if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-50" />;
    return asc ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };

  return (
    <div className="glass-card rounded-2xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
            <TableHead className="w-10"></TableHead>
            <TableHead className="cursor-pointer font-heading select-none" onClick={() => handleSort('name')}>
              Candidate <SortIcon active={sortKey === 'name'} asc={sortAsc} />
            </TableHead>
            <TableHead className="cursor-pointer font-heading select-none" onClick={() => handleSort('ats_score')}>
              ATS Score <SortIcon active={sortKey === 'ats_score'} asc={sortAsc} />
            </TableHead>
            <TableHead className="font-heading">Top Skills</TableHead>
            <TableHead className="cursor-pointer font-heading select-none" onClick={() => handleSort('status')}>
              Status <SortIcon active={sortKey === 'status'} asc={sortAsc} />
            </TableHead>
            <TableHead className="cursor-pointer font-heading select-none" onClick={() => handleSort('ml_prediction')}>
              ML <SortIcon active={sortKey === 'ml_prediction'} asc={sortAsc} />
            </TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, i) => {
            const isTop = r.id === topCandidateId;
            const skillList = (r.skills || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 3);
            return (
              <motion.tr
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
                className={`border-b border-border/30 transition-colors hover:bg-primary/5 ${isTop ? 'bg-primary/5' : ''}`}
              >
                <TableCell>
                  <button
                    onClick={() => onShortlistToggle(r.id, !r.shortlisted)}
                    className="transition-transform hover:scale-125"
                    title={r.shortlisted ? 'Remove from shortlist' : 'Shortlist'}
                  >
                    <Star className={`h-5 w-5 ${r.shortlisted ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                  </button>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isTop && (
                      <span title="Top Candidate" className="inline-flex h-6 w-6 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-md shadow-primary/30 animate-pulse-glow">
                        <Trophy className="h-3 w-3" />
                      </span>
                    )}
                    <span>{r.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <CircularScore value={r.ats_score ?? 0} size={48} stroke={5} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {skillList.length > 0
                      ? skillList.map((s, j) => <SkillChip key={j} label={s} />)
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className={statusColor(r.status)}>{r.status || '—'}</Badge></TableCell>
                <TableCell>
                  <Badge variant={r.ml_prediction === 'Suitable' ? 'default' : 'secondary'} className="text-xs">
                    {r.ml_prediction || '—'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => onView(r.id)} className="rounded-lg gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                </TableCell>
              </motion.tr>
            );
          })}
          {sorted.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No resumes match the filters</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
