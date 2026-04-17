import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

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
    if (s === 'Good') return 'bg-success/10 text-success border-success/20';
    if (s === 'Average') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  const SortIcon = ({ active, asc }: { active: boolean; asc: boolean }) => (
    <span className="ml-1 text-xs">{active ? (asc ? '↑' : '↓') : '↕'}</span>
  );

  return (
    <div className="glass-card rounded-2xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-10"></TableHead>
            <TableHead className="cursor-pointer font-heading" onClick={() => handleSort('name')}>
              Candidate <SortIcon active={sortKey === 'name'} asc={sortAsc} />
            </TableHead>
            <TableHead className="cursor-pointer font-heading" onClick={() => handleSort('score')}>
              Score <SortIcon active={sortKey === 'score'} asc={sortAsc} />
            </TableHead>
            <TableHead className="cursor-pointer font-heading" onClick={() => handleSort('ats_score')}>
              ATS Score <SortIcon active={sortKey === 'ats_score'} asc={sortAsc} />
            </TableHead>
            <TableHead className="cursor-pointer font-heading" onClick={() => handleSort('status')}>
              Status <SortIcon active={sortKey === 'status'} asc={sortAsc} />
            </TableHead>
            <TableHead className="cursor-pointer font-heading" onClick={() => handleSort('ml_prediction')}>
              ML Prediction <SortIcon active={sortKey === 'ml_prediction'} asc={sortAsc} />
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, i) => (
            <motion.tr
              key={r.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
            >
              <TableCell>
                <button
                  onClick={() => onShortlistToggle(r.id, !r.shortlisted)}
                  className="text-xl"
                  title={r.shortlisted ? 'Remove from shortlist' : 'Shortlist'}
                >
                  {r.shortlisted ? '⭐' : '☆'}
                </button>
              </TableCell>
              <TableCell className="font-medium">
                {r.id === topCandidateId && <span className="mr-1" title="Top Candidate">🏆</span>}
                {r.name}
              </TableCell>
              <TableCell><span className="font-bold">{r.score ?? 0}%</span></TableCell>
              <TableCell><span className="font-bold text-primary">{r.ats_score ?? 0}%</span></TableCell>
              <TableCell><Badge variant="outline" className={statusColor(r.status)}>{r.status || '—'}</Badge></TableCell>
              <TableCell>
                <Badge variant={r.ml_prediction === 'Suitable' ? 'default' : 'secondary'}>
                  {r.ml_prediction || '—'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => onView(r.id)} className="rounded-lg">View</Button>
              </TableCell>
            </motion.tr>
          ))}
          {sorted.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No resumes match the filters</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
