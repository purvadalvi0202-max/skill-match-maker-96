import { motion } from 'framer-motion';

interface Props {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
}

export default function CircularScore({ value, size = 56, stroke = 6, label }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (v / 100) * circ;

  // color by score
  const color =
    v >= 75 ? 'hsl(var(--success))' :
    v >= 50 ? 'hsl(var(--warning))' :
    'hsl(var(--destructive))';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold" style={{ color }}>{v}%</span>
        {label && <span className="text-[9px] text-muted-foreground mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
