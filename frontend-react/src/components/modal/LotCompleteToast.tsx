import { CheckCircle2 } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';
import { useUIStore } from '@/store/uiStore';

/**
 * Centered popup modal shown when a lot completes.
 * No fade/opacity animation — appears instantly.
 */
export function LotCompleteToast() {
  const isOpen       = useUIStore((s) => s.openModals.has('lotComplete'));
  const completedLot = useUIStore((s) => s.completedLot);
  const nextLot      = useUIStore((s) => s.nextLot);
  const closeModal   = useUIStore((s) => s.closeModal);

  return (
    <ModalOverlay isOpen={isOpen} instant onClose={() => closeModal('lotComplete')}>
      <div className="w-full max-w-sm bg-bg-card border border-c-green/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5">
          <CheckCircle2 size={32} className="shrink-0 text-c-green" />
          <div>
            <div className="text-lg font-extrabold text-t-primary">
              Lot {completedLot} Selesai!
            </div>
            <div className="text-sm text-c-green">Melanjutkan ke Lot {nextLot}</div>
          </div>
        </div>
        <div className="px-6 pb-5">
          <button
            onClick={() => closeModal('lotComplete')}
            className="w-full py-2.5 rounded-lg bg-c-green text-white font-bold text-sm
                       hover:shadow-glow-green transition-all duration-200"
          >
            Lanjut
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
