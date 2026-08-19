import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { getProgressState, calcProgressRatio, formatWeight } from '@/utils/scaleUtils';

interface WeightDisplayProps {
  weight:    number;
  target:    number;
  scaleType: 'small' | 'large';
}

export function WeightDisplay({ weight, target, scaleType }: WeightDisplayProps) {
  const ratio = calcProgressRatio(weight, target);
  const state = getProgressState(ratio);

  const colourClass = cn({
    'text-c-blue':   scaleType === 'small' && state === 'normal',
    'text-c-purple': scaleType === 'large' && state === 'normal',
    'text-c-amber':  state === 'near',
    'text-c-green':  state === 'ok',
    'text-c-red animate-flash-alarm': state === 'over',
  });

  const displayValue = formatWeight(weight);

  return (
    <div className="flex items-end gap-2 justify-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={displayValue}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className={cn(
            'font-mono text-[clamp(4.5rem,11vw,9rem)] font-bold leading-none tabular-nums',
            colourClass,
          )}
        >
          {displayValue}
        </motion.span>
      </AnimatePresence>
      <span className="font-mono text-3xl font-semibold text-t-secondary mb-3">kg</span>
    </div>
  );
}
