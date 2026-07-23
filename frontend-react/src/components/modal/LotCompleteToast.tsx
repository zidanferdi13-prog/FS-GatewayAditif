import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

/**
 * Auto-dismissing bottom toast that appears when a lot completes.
 * Mirrors the original 2.6 s `lotIncrementModal`.
 */
export function LotCompleteToast() {
  const isOpen       = useUIStore((s) => s.openModals.has('lotComplete'));
  const completedLot = useUIStore((s) => s.completedLot);
  const nextLot      = useUIStore((s) => s.nextLot);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0  }}
          exit={{ opacity: 0, y: 40   }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl
                          bg-c-green-dim border border-c-green text-c-green
                          shadow-glow-green min-w-[280px]">
            <CheckCircle2 size={22} className="shrink-0" />
            <div>
              <div className="text-sm font-bold">Lot {completedLot} Selesai!</div>
              <div className="text-xs text-c-green">Melanjutkan ke Lot {nextLot}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
