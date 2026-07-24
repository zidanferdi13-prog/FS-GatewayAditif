import { ScalePanel } from '@/components/scale/ScalePanel';
import { ActiveMaterialCard } from './ActiveMaterialCard';
import { useMOStore, selectExpectedScale } from '@/store/moStore';
import { cn } from '@/utils/cn';

/**
 * The main working area: dual scale panels side-by-side with an optional
 * RM queue column when a MO is active.
 */
export function DashboardScreen() {
  const hasActiveMO = useMOStore((s) => !!s.moData);
  const expectedScale = useMOStore(selectExpectedScale);

  const cols = hasActiveMO
    ? expectedScale === 'small'
      ? '1.7fr 28px 1fr'
      : expectedScale === 'large'
        ? '1fr 28px 1.7fr'
        : '1fr 28px 1fr'
    : '1fr 28px 1fr';

  return (
    <div
      className={cn(
        'grid h-full gap-3 p-4 rounded-lg transition-all duration-500',
        hasActiveMO && 'bg-gradient-to-br from-c-green-dim/5 to-transparent ring-1 ring-c-green/20 shadow-glow-green/40',
      )}
      style={{
        gridTemplateColumns: cols,
        gridTemplateRows: hasActiveMO ? '135px minmax(0, 1fr)' : '1fr',
      }}>

      {/* RM queue (only when MO is loaded) */}
      {hasActiveMO && (
        <div className="col-span-full min-h-0">
          <ActiveMaterialCard />
        </div>
      )}

      {/* Small scale panel */}
      <ScalePanel scaleType="small" />

      {/* Divider */}
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="flex-1 w-px bg-b-card" />
        <span className="text-[10px] font-extrabold text-t-muted uppercase tracking-widest
                         rotate-0 py-2 px-1 border border-b-card rounded bg-bg-card">
          VS
        </span>
        <div className="flex-1 w-px bg-b-card" />
      </div>

      {/* Large scale panel */}
      <ScalePanel scaleType="large" />
    </div>
  );
}
