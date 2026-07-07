import { useMOStore, selectCurrentMaterial } from '@/store/moStore';
import { RMQueueList } from '@/components/mo/RMQueueList';

/**
 * Side panel (or collapsible drawer) showing the full RM queue
 * for the active MO with the current item highlighted.
 */
export function ActiveMaterialCard() {
  const moData        = useMOStore((s) => s.moData);
  const currentIndex  = useMOStore((s) => s.currentRMIndex);
  const currentMat    = useMOStore(selectCurrentMaterial);

  if (!moData) return null;

  return (
    <div className="flex flex-col gap-2 h-full p-3 bg-bg-elevated border border-b-card rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-t-muted uppercase tracking-widest">
          Antrian RM
        </span>
        <span className="text-xs text-t-secondary">
          {currentIndex + 1} / {moData.produk_rm_items.length}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <RMQueueList
          items={moData.produk_rm_items}
          targetWeights={moData.target_weights}
          activeIndex={currentIndex}
          layout="horizontal"
        />
      </div>
    </div>
  );
}
