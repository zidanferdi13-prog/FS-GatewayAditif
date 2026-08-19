import { PartyPopper } from 'lucide-react';
import { motion } from 'framer-motion';
import { ModalOverlay } from './ModalOverlay';
import { useMOStore } from '@/store/moStore';
import { useUIStore } from '@/store/uiStore';
import { useScaleStore } from '@/store/scaleStore';

export function CompletionModal() {
  const isOpen    = useUIStore((s) => s.openModals.has('completion'));
  const closeModal = useUIStore((s) => s.closeModal);
  const activeMO  = useMOStore((s) => s.activeMO);
  const totalLot  = useMOStore((s) => s.totalLot);
  const materials = useMOStore((s) => s.materials);
  const resetMO   = useMOStore((s) => s.resetMO);
  const resetScale = useScaleStore((s) => s.resetAll);

  const handleDone = () => {
    closeModal('completion');
    resetMO();
    resetScale();
    useUIStore.getState().openModal('moInput');
  };

  const totalItems = totalLot * materials.length;

  const stats = [
    { label: 'Nomor MO',     value: activeMO ?? '—'     },
    { label: 'Total Lot',    value: totalLot             },
    { label: 'Item RM',      value: materials.length     },
    { label: 'Total Timbang', value: totalItems           },
  ];

  return (
    <ModalOverlay isOpen={isOpen} persistent>
      <div className="w-full max-w-md bg-bg-card border border-c-green/40 rounded-xl shadow-[0_0_60px_rgba(34,197,94,0.2)] overflow-hidden">
        {/* Head */}
        <div className="px-6 pt-8 pb-5 text-center border-b border-b-card">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <PartyPopper className="mx-auto text-c-green mb-3" size={44} />
          </motion.div>
          <h2 className="text-xl font-extrabold text-c-green">MO Selesai!</h2>
          <p className="text-sm text-t-secondary mt-1">Semua lot telah berhasil ditimbang</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 p-6">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col items-center py-4 px-3 rounded-lg border border-b-card bg-bg-elevated"
            >
              <span className="font-mono text-xl font-bold text-t-primary break-all leading-tight text-center">{s.value}</span>
              <span className="text-xs text-t-muted uppercase tracking-wider mt-1">{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Foot */}
        <div className="px-6 pb-6">
          <button
            onClick={handleDone}
            className="w-full py-3 rounded-lg bg-c-green text-white font-bold text-sm
                       hover:shadow-glow-green transition-all duration-200"
          >
            Selesai &amp; Reset
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
