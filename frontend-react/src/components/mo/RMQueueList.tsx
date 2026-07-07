import { cn } from '@/utils/cn';
import { getScaleForWeight } from '@/utils/scaleUtils';

interface RMQueueListProps {
  items:         string[];
  targetWeights: string[];
  /** Highlight the currently active item */
  activeIndex?:  number;
  layout?:       'vertical' | 'horizontal';
}

export function RMQueueList({ items, targetWeights, activeIndex, layout = 'vertical' }: RMQueueListProps) {
  const isHorizontal = layout === 'horizontal';

  return (
    <div className={cn('flex gap-2', isHorizontal ? 'flex-row overflow-x-auto pb-1' : 'flex-col')}>
      {items.map((name, i) => {
        const target    = parseFloat(targetWeights[i]) || 0;
        const scaleType = getScaleForWeight(target);
        const isActive  = i === activeIndex;

        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200',
              isHorizontal && 'min-w-[240px] flex-1',
              isActive
                ? 'border-c-blue bg-c-blue-dim'
                : 'border-b-card bg-bg-elevated',
            )}
          >
            {/* Index */}
            <span
              className={cn(
                'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0',
                scaleType === 'small'
                  ? 'bg-c-blue-dim text-c-blue-bright'
                  : 'bg-c-purple-dim text-[var(--c-purple)]',
              )}
            >
              {i + 1}
            </span>

            {/* Name */}
            <span className="flex-1 text-sm font-medium text-t-primary truncate">{name}</span>

            {/* Meta: weight + scale badge */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-sm font-semibold text-t-secondary">
                {target.toFixed(2)} kg
              </span>
              <span
                className={cn(
                  'text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded',
                  scaleType === 'small'
                    ? 'bg-c-blue-dim text-c-blue-bright'
                    : 'bg-c-purple-dim text-[var(--c-purple)]',
                )}
              >
                {scaleType === 'small' ? 'SMALL' : 'LARGE'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
