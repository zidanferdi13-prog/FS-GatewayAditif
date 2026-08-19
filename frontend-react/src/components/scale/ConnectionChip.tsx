import { cn } from '@/utils/cn';

interface ConnectionChipProps {
  label:     string;
  connected: boolean;
}

export function ConnectionChip({ label, connected }: ConnectionChipProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-[5px] px-[10px] py-1 rounded-pill border-[1.5px] bg-bg-card transition-colors duration-300',
        connected ? 'border-c-green' : 'border-b-card',
      )}
    >
      {/* Status dot */}
      <span
        className={cn(
          'w-[7px] h-[7px] rounded-full transition-all duration-300',
          connected
            ? 'bg-c-green shadow-glow-green'
            : 'bg-t-muted',
        )}
      />
      <span className="font-mono text-sm font-semibold text-t-secondary tracking-[0.4px]">
        {label}
      </span>
      <span
        className={cn(
          'text-[11px] font-extrabold uppercase tracking-[1px]',
          connected ? 'text-c-green' : 'text-t-muted',
        )}
      >
        {connected ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
