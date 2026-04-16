import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Resume {
  id: string;
  name: string;
  skills: string | null;
  experience: string | null;
  education: string | null;
  score: number | null;
  status: string | null;
  ml_prediction: string | null;
}

interface ResumeTableProps {
  resumes: Resume[];
  topCandidateId?: string;
}

type SortKey = 'name' | 'score' | 'status' | 'ml_prediction';

export default function ResumeTable({ resumes, topCandidateId }: ResumeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
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
    <div className="glass-card rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="cursor-pointer font-heading" onClick={() => handleSort('name')}>
              Candidate <SortIcon active={sortKey === 'name'} asc={sortAsc} />
            </TableHead>
            <TableHead>Skills</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead>Education</TableHead>
            <TableHead className="cursor-pointer font-heading" onClick={() => handleSort('score')}>
              Score <SortIcon active={sortKey === 'score'} asc={sortAsc} />
            </TableHead>
            <TableHead className="cursor-pointer font-heading" onClick={() => handleSort('status')}>
              Status <SortIcon active={sortKey === 'status'} asc={sortAsc} />
            </TableHead>
            <TableHead className="cursor-pointer font-heading" onClick={() => handleSort('ml_prediction')}>
              ML Prediction <SortIcon active={sortKey === 'ml_prediction'} asc={sortAsc} />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, i) => (
            <motion.tr
              key={r.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
            >
              <TableCell className="font-medium">
                {r.id === topCandidateId && <span className="mr-1" title="Top Candidate">🏆</span>}
                {r.name}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.skills || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{r.experience || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{r.education || '—'}</TableCell>
              <TableCell>
                <span className="font-bold text-foreground">{r.score ?? 0}%</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor(r.status)}>{r.status || '—'}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={r.ml_prediction === 'Suitable' ? 'default' : 'secondary'}>
                  {r.ml_prediction || '—'}
                </Badge>
              </TableCell>
            </motion.tr>
          ))}
          {sorted.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No resumes analyzed yet</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
