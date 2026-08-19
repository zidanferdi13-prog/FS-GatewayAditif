import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { calcProgressRatio, getProgressState } from '@/utils/scaleUtils';

interface ProgressBarProps {
  weight:     number;
  target:     number;
  /** Which scale this bar belongs to — affects accent colour */
  scaleType:  'small' | 'large';
}

const stateColours = {
  normal: {
    small: 'var(--c-blue)',
    large: 'var(--c-purple)',
  },
  near: { small: 'var(--c-amber)', large: 'var(--c-amber)' },
  ok:   { small: 'var(--c-green)', large: 'var(--c-green)' },
  over: { small: 'var(--c-red)',   large: 'var(--c-red)'   },
} as const;

export function ProgressBar({ weight, target, scaleType }: ProgressBarProps) {
  const ratio       = calcProgressRatio(weight, target);
  const fillPct     = Math.min(ratio * 100, 100);
  const state       = getProgressState(ratio);
  const fillColour  = stateColours[state][scaleType];

  return (
    <div className="relative h-5 w-full rounded-full bg-bg-elevated overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: fillColour }}
        animate={{ width: `${fillPct}%` }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      />
      {/* Subtle shimmer on the fill */}
      {state !== 'over' && fillPct > 0 && (
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-30"
          style={{
            width:      `${fillPct}%`,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.5) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}
    </div>
  );
}
