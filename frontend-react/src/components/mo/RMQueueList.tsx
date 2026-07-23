import { cn } from '@/utils/cn';
import { getScaleForWeight } from '@/utils/scaleUtils';
import { Info } from 'lucide-react';

interface RMQueueListProps {
  items:         string[];
  targetWeights: string[];
  informasi?:    (string | null)[];
  /** Highlight the currently active item */
  activeIndex?:  number;
  layout?:       'vertical' | 'horizontal';
}

export function RMQueueList({ items, targetWeights, informasi, activeIndex, layout = 'vertical' }: RMQueueListProps) {
  const isHorizontal = layout === 'horizontal';

  return (
    <div className={cn('flex gap-2', isHorizontal ? 'flex-row overflow-x-auto pb-1' : 'flex-col')}>
      {items.map((name, i) => {
        const target    = parseFloat(targetWeights[i]) || 0;
        const scaleType = getScaleForWeight(target);
        const isActive  = i === activeIndex;
        const info      = informasi?.[i];

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

            {/* Name + optional informasi */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-t-primary truncate block">{name}</span>
              {info && (
                <p className="text-[11px] font-bold text-c-warning mt-0.5 leading-tight">{info}</p>
              )}
            </div>

            {/* Meta: weight + scale badge + info icon tooltip */}
            <div className="flex items-center gap-2 shrink-0">
              {info && (
                <span className="group relative inline-flex">
                  <Info size={14} className="text-c-warning cursor-help" />
                  <span className="absolute bottom-full right-0 mb-1.5 w-56 p-2 rounded-lg bg-bg-elevated border border-b-card text-xs text-t-secondary shadow-lg
                                   opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-10">
                    {info}
                  </span>
                </span>
              )}
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
