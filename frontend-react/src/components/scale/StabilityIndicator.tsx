import { cn } from '@/utils/cn';

interface StabilityIndicatorProps {
  stable: boolean;
}

export function StabilityIndicator({ stable }: StabilityIndicatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-[6px] px-3 py-[5px] rounded-pill border transition-all duration-300',
        stable
          ? 'border-c-green bg-c-green-dim text-c-green'
          : 'border-c-amber bg-c-amber-dim text-c-amber',
      )}
    >
      <span
        className={cn(
          'w-[10px] h-[10px] rounded-full',
          stable ? 'bg-c-green animate-pulse-slow' : 'bg-c-amber animate-pulse',
        )}
      />
      <span className="text-[18px] font-extrabold uppercase tracking-[1.2px]">
        {stable ? 'STABIL' : 'GOYANG'}
      </span>
    </div>
  );
}
