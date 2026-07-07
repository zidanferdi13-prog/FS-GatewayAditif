import { ScalePanel } from '@/components/scale/ScalePanel';
import { ActiveMaterialCard } from './ActiveMaterialCard';
import { useMOStore } from '@/store/moStore';

/**
 * The main working area: dual scale panels side-by-side with an optional
 * RM queue column when a MO is active.
 */
export function DashboardScreen() {
  const hasActiveMO = useMOStore((s) => !!s.moData);

  return (
    <div className="grid h-full gap-3 p-4"
         style={{
           gridTemplateColumns: '1fr 28px 1fr',
           gridTemplateRows: hasActiveMO ? '112px minmax(0, 1fr)' : '1fr',
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
