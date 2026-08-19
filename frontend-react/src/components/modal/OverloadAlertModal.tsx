import { Ban } from 'lucide-react';
import { motion } from 'framer-motion';
import { ModalOverlay } from './ModalOverlay';
import { useUIStore } from '@/store/uiStore';
import { useScaleStore } from '@/store/scaleStore';

/**
 * Full-screen alarm dialog shown when the active scale weight exceeds the target.
 * Uses a dark-red overlay to visually communicate danger.
 */
export function OverloadAlertModal() {
  const isOpen        = useUIStore((s) => s.openModals.has('overload'));
  const closeModal    = useUIStore((s) => s.closeModal);
  const overloadWeight = useUIStore((s) => s.overloadWeight);
  const overloadTarget = useUIStore((s) => s.overloadTarget);

  const handleDismiss = () => {
    closeModal('overload');
  };

  return (
    <ModalOverlay isOpen={isOpen} variant="alarm" persistent>
      <div className="w-full max-w-sm bg-[#1a0505] border border-c-red/50 rounded-xl shadow-[0_0_60px_rgba(239,68,68,0.4)] overflow-hidden">
        {/* Head */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-c-red/20">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <Ban className="mx-auto text-c-red mb-2" size={40} strokeWidth={2} />
          </motion.div>
          <h2 className="text-xl font-extrabold text-c-red uppercase tracking-widest">
            BERAT MELEBIHI TARGET
          </h2>
          <p className="text-sm text-c-red mt-1">Segera angkat material dari timbangan</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 divide-x divide-c-red/20 px-0 py-0">
          <div className="flex flex-col items-center py-6 px-4">
            <span className="text-xs font-semibold text-c-red uppercase tracking-widest mb-1">
              Berat Sekarang
            </span>
            <div className="flex items-end gap-1">
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="font-mono text-3xl font-bold text-c-red"
              >
                {overloadWeight.toFixed(2)}
              </motion.span>
              <span className="font-mono text-base text-c-red mb-0.5">kg</span>
            </div>
          </div>
          <div className="flex flex-col items-center py-6 px-4">
            <span className="text-xs font-semibold text-c-red uppercase tracking-widest mb-1">
              Target Maksimum
            </span>
            <div className="flex items-end gap-1">
              <span className="font-mono text-3xl font-bold text-c-red">
                {overloadTarget.toFixed(2)}
              </span>
              <span className="font-mono text-base text-c-red mb-0.5">kg</span>
            </div>
          </div>
        </div>

        {/* Foot */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-lg bg-c-red text-white font-bold text-sm uppercase tracking-widest
                       hover:shadow-glow-red transition-all duration-200"
          >
            Mengerti
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
