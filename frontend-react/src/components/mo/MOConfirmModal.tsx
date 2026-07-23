import { PackageOpen } from 'lucide-react';
import { ModalOverlay } from '@/components/modal/ModalOverlay';
import { RMQueueList } from './RMQueueList';
import { useMOStore } from '@/store/moStore';
import { useUIStore } from '@/store/uiStore';
import type { MOData } from '@/types';

export function MOConfirmModal() {
  const isOpen      = useUIStore((s) => s.openModals.has('moConfirm'));
  const closeModal  = useUIStore((s) => s.closeModal);
  const confirmMOData = useMOStore((s) => s.confirmMOData);
  const resetMO     = useMOStore((s) => s.resetMO);

  const data = window.__tempMOData as MOData | undefined;

  const handleConfirm = () => {
    if (!data) return;
    confirmMOData(data);
    window.__tempMOData = undefined;
    closeModal('moConfirm');
  };

  const handleCancel = () => {
    window.__tempMOData = undefined;
    closeModal('moConfirm');
    resetMO();
    useUIStore.getState().openModal('moInput');
  };

  if (!data) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleCancel}>
      <div className="dialog w-full max-w-lg bg-bg-card border border-b-card rounded-xl shadow-2xl overflow-hidden">
        {/* Head */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-b-card">
          <PackageOpen className="mx-auto text-c-blue mb-2" size={32} />
          <h2 className="text-lg font-bold text-t-primary">Konfirmasi Data MO</h2>
          <p className="text-sm text-t-secondary mt-1">
            Periksa detail sebelum proses penimbangan dimulai
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-b-card border-b border-b-card">
          {[
            { label: 'Nomor MO',   value: data.nomor_mo     },
            { label: 'Total Lot',  value: data.qty_plan     },
            { label: 'Produk RM',  value: data.total_rm     },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-4 px-3">
              <span className="text-[11px] text-t-muted uppercase tracking-widest font-semibold mb-1">
                {s.label}
              </span>
              <span className="font-mono text-xl font-bold text-t-primary">{s.value}</span>
            </div>
          ))}
        </div>

        {/* RM List */}
        <div className="px-6 py-4 max-h-56 overflow-y-auto">
          <p className="text-xs font-semibold text-t-muted uppercase tracking-widest mb-3">
            Detail Produk RM
          </p>
          <RMQueueList items={data.produk_rm_items} targetWeights={data.target_weights} informasi={data.produk_rm_informasi} />
        </div>

        {/* Foot */}
        <div className="px-6 pb-6 flex gap-3 justify-end border-t border-b-card pt-4">
          <button
            onClick={handleCancel}
            className="px-5 py-2 rounded-lg border border-b-card text-t-secondary text-sm font-medium
                       hover:bg-bg-elevated transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 rounded-lg bg-c-blue text-white text-sm font-semibold
                       hover:bg-c-blue-bright hover:shadow-glow-blue transition-all"
          >
            Konfirmasi &amp; Mulai
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
