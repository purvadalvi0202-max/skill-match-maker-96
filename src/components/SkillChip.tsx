// Stable hash-based color so each skill gets a consistent chip color.
const PALETTE = [
  { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
  { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
  { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/20' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
  { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/20' },
  { bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-500/20' },
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

interface Props {
  label: string;
  variant?: 'default' | 'destructive';
  size?: 'sm' | 'md';
}

export default function SkillChip({ label, variant = 'default', size = 'sm' }: Props) {
  const sizeClass = size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5';

  if (variant === 'destructive') {
    return (
      <span className={`inline-flex items-center rounded-full font-medium border bg-destructive/10 text-destructive border-destructive/20 ${sizeClass}`}>
        {label}
      </span>
    );
  }
  const c = PALETTE[hash(label.toLowerCase()) % PALETTE.length];
  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${c.bg} ${c.text} ${c.border} ${sizeClass}`}>
      {label}
    </span>
  );
}

export function ChipList({ items, variant }: { items?: string | null; variant?: 'default' | 'destructive' }) {
  const list = (items || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((s, i) => <SkillChip key={i} label={s} variant={variant} />)}
    </div>
  );
}
