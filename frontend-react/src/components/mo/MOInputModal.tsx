import { useRef, useEffect } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { ModalOverlay } from '@/components/modal/ModalOverlay';
import { useMOStore } from '@/store/moStore';
import { useUIStore } from '@/store/uiStore';
import { socketService } from '@/services/socket';

export function MOInputModal() {
  const inputRef   = useRef<HTMLInputElement>(null);
  const isOpen     = useUIStore((s) => s.openModals.has('moInput'));
  const closeModal = useUIStore((s) => s.closeModal);
  const setActiveMO = useMOStore((s) => s.setActiveMO);
  const loading    = useUIStore((s) => s.moInputLoading);
  const setMoInputLoading = useUIStore((s) => s.setMoInputLoading);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const value = inputRef.current?.value.trim() ?? '';
    if (!value || loading) return;

    setActiveMO(value);
    setMoInputLoading(true);

    socketService.emit('mo-confirmed', {
      mo:        value,
      timestamp: new Date().toISOString(),
    });
  };

  const handleCancel = () => {
    if (loading) return;
    closeModal('moInput');
    if (inputRef.current) inputRef.current.value = '';
    setMoInputLoading(false);
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleCancel}>
      <div className="dialog w-full max-w-md bg-bg-card border border-b-card rounded-xl shadow-2xl overflow-hidden">
        {/* Head */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-b-card">
          <div className="text-3xl mb-2"><ClipboardList className="mx-auto text-c-blue" size={32} /></div>
          <h2 className="text-lg font-bold text-t-primary">Input Nomor MO</h2>
          <p className="text-sm text-t-secondary mt-1">
            Masukkan nomor Manufacturing Order untuk memulai penimbangan
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <label className="block text-xs font-semibold text-t-secondary uppercase tracking-widest mb-2">
            Nomor MO
          </label>
          <input
            ref={inputRef}
            type="text"
            placeholder="Contoh: WAN/MO/26/1234"
            maxLength={50}
            autoComplete="off"
            disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-4 py-2.5 rounded-lg bg-bg-elevated border border-b-card text-t-primary
                       placeholder-t-muted font-mono text-sm
                       focus:outline-none focus:border-c-blue focus:ring-1 focus:ring-c-blue
                       transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Foot */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-5 py-2 rounded-lg border border-b-card text-t-secondary text-sm font-medium
                       hover:bg-bg-elevated transition-colors duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-c-blue text-white text-sm font-semibold
                       hover:bg-c-blue-bright hover:shadow-glow-blue transition-all duration-150
                       disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Memuat…' : 'Mulai'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
