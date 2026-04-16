import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  accent?: boolean;
}

export default function StatCard({ title, value, icon, accent }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={`glass-card rounded-2xl p-6 ${accent ? 'ring-2 ring-primary/30 animate-pulse-glow' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}
