import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

/**
 * Auto-dismissing modal that appears when a "Kemasan" material is auto-skipped.
 * Shows which Kemasan material is being skipped.
 */
export function SkipKemasanModal() {
  const isOpen   = useUIStore((s) => s.openModals.has('skipKemasan'));
  const skipName = useUIStore((s) => s.skipKemasanName);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="flex items-center gap-4 px-6 py-4 rounded-xl
                          bg-c-amber-dim border border-c-amber text-c-amber
                          shadow-2xl min-w-[300px]">
            <SkipForward size={28} className="shrink-0" />
            <div>
              <div className="text-base font-bold">Melewati {skipName}</div>
              <div className="text-xs text-c-amber">Material Kemasan — tidak perlu ditimbang</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
