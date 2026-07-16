import { memo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Printer } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useMOStore, selectCurrentMaterial, selectExpectedScale } from '@/store/moStore';
import { useScaleStore } from '@/store/scaleStore';
import { useUIStore } from '@/store/uiStore';
import { socketService } from '@/services/socket';
import { WeightDisplay } from './WeightDisplay';
import { ProgressBar } from './ProgressBar';
import { StabilityIndicator } from './StabilityIndicator';
import { AUTO_CONFIRM_DELAY_MS, SKIP_KEMASAN_DELAY_MS } from '@/utils/scaleUtils';
import type { ScaleType } from '@/types';

interface ScalePanelProps {
  scaleType: ScaleType;
}

const BADGE_LABEL = { small: 'SMALL', large: 'LARGE' } as const;
const RANGE_LABEL = { small: '≤ 20 kg', large: '> 20 kg' } as const;

/**
 * Full-featured panel for one physical scale.
 * Re-renders only when its own slice of the store changes (memo).
 */
export const ScalePanel = memo(function ScalePanel({ scaleType }: ScalePanelProps) {
  // ── Store slices ─────────────────────────────────────────────────────────
  const scaleState     = useScaleStore((s) => s[scaleType]);
  const moData         = useMOStore((s) => s.moData);
  const autoConfirm    = useMOStore((s) => s.autoConfirmActive);
  const currentMaterial = useMOStore(selectCurrentMaterial);
  const expectedScale  = useMOStore(selectExpectedScale);
  const openModal      = useUIStore((s) => s.openModal);
  const closeModal     = useUIStore((s) => s.closeModal);
  const setSkipKemasanName = useUIStore((s) => s.setSkipKemasanName);

  const isActiveScale = scaleType === expectedScale;
  const target        = isActiveScale ? (currentMaterial?.targetWeight ?? 0) : 0;
  const { weight, stable, lastUpdate } = scaleState;

  // ── print-lot-data feedback — listen for local printer result ─────────────
  const showToastRef = useRef(useUIStore.getState().showToast);
  // Keep ref fresh without re-registering the listener
  showToastRef.current = useUIStore((s) => s.showToast);

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const onResult = (result: { success: boolean; data?: unknown; error?: string }) => {
      const toast = useUIStore.getState().showToast;
      if (!result.success) {
        console.warn('❌ Print lot failed:', result.error);
        toast({
          type: 'error',
          title: 'Cetak Lot Gagal',
          message: result.error ?? 'Printer tidak merespon',
          duration: 6000,
        });
        return;
      }
      console.log('✅ Print lot sent to printer');
      toast({
        type: 'success',
        title: 'Cetak Lot',
        message: 'Label lot telah dikirim ke printer',
        duration: 3000,
      });
    };

    socket.on('print-lot-data', onResult);
    return () => { socket.off('print-lot-data', onResult); };
  }, []);

  // ── Manual confirm ────────────────────────────────────────────────────────
  const handleManualConfirm = useCallback(() => {
    const { activeMO, moData: data, autoConfirmActive, currentRMIndex, materials, currentLot } =
      useMOStore.getState();
    if (!activeMO || !data || autoConfirmActive) return;
    if (scaleType !== selectExpectedScale(useMOStore.getState())) return;

    const rm = materials[currentRMIndex];
    if (!rm) return;

    useMOStore.getState().setAutoConfirmActive(true);

    socketService.emit('print-confirm', {
      mo:         activeMO,
      lot:        currentLot,
      rm_index:   currentRMIndex,
      rm_name:    rm.name,
      scale_used: scaleType,
      weight,
      target,
      timestamp:  new Date().toISOString(),
    });

    const completedLot = currentLot; // Capture before advance
    setTimeout(() => {
      useMOStore.getState().setAutoConfirmActive(false);
      const result = useMOStore.getState().advanceRM();

      if (result === 'complete' || result === 'next_lot') {
        socketService.emit('print-lot', {
          mo:        activeMO,
          lot:       completedLot,
          timestamp: new Date().toISOString(),
        });
      }

      if (result === 'complete') {
        const st = useMOStore.getState();
        socketService.emit('mo-completed', {
          mo:             st.activeMO ?? '',
          lots_completed: st.totalLot,
          timestamp:      new Date().toISOString(),
        });
        openModal('completion');
        return;
      }

      if (result === 'next_lot') {
        const st = useMOStore.getState();
        useUIStore.getState().setLotComplete(completedLot, st.currentLot);
        openModal('lotComplete');
        setTimeout(() => useUIStore.getState().closeModal('lotComplete'), 2600);
      }
    }, AUTO_CONFIRM_DELAY_MS);
  }, [scaleType, weight, target, openModal]);

  // ── Auto-skip Kemasan material ──────────────────────────
  useEffect(() => {
    const state = useMOStore.getState();
    const { activeMO, moData: md, currentMaterial: cm, autoConfirmActive, currentRMIndex, currentLot, totalLot } = state;

    // Guard: only run on small panel, MO active, autoConfirm NOT running
    if (scaleType !== 'small') return;
    if (!activeMO || !md || !cm) return;
    if (autoConfirmActive) return;
    if (cm.kategori !== 'Kemasan') return;

    // Show flash
    setSkipKemasanName(cm.name);
    openModal('skipKemasan');

    // Mark auto-confirm active to prevent re-entry
    state.setAutoConfirmActive(true);

    const timer = setTimeout(() => {
      // Record weight with target value
      socketService.emit('print-confirm', {
        mo:         activeMO,
        lot:        currentLot,
        rm_index:   currentRMIndex,
        rm_name:    cm.name,
        scale_used: scaleType,
        weight:     cm.targetWeight,
        target:     cm.targetWeight,
        timestamp:  new Date().toISOString(),
      });

      closeModal('skipKemasan');
      useMOStore.getState().setAutoConfirmActive(false);

      const completedLot = currentLot; // Capture before advance
      const result = useMOStore.getState().advanceRM();

      if (result === 'next_lot' || result === 'complete') {
        socketService.emit('print-lot', {
          mo:        activeMO,
          lot:       completedLot,
          timestamp: new Date().toISOString(),
        });
      }

      if (result === 'complete') {
        const st = useMOStore.getState();
        socketService.emit('mo-completed', {
          mo:             st.activeMO ?? '',
          lots_completed: st.totalLot,
          timestamp:      new Date().toISOString(),
        });
        openModal('completion');
      }

      if (result === 'next_lot') {
        const st = useMOStore.getState();
        useUIStore.getState().setLotComplete(completedLot, st.currentLot);
        openModal('lotComplete');
        setTimeout(() => useUIStore.getState().closeModal('lotComplete'), 2600);
      }
      // If next material is also Kemasan, effect re-fires on next render
    }, SKIP_KEMASAN_DELAY_MS);

    return () => {
      clearTimeout(timer);
      closeModal('skipKemasan');
    };
  }, [scaleType, currentMaterial, currentRMIndex, openModal, closeModal, setSkipKemasanName]);

  // ── Timestamp ─────────────────────────────────────────────────────────────
  const timestampText = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : 'Menunggu data…';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'scale-panel relative flex flex-col gap-3 p-5 rounded-xl border-2 overflow-hidden',
        'transition-all duration-350',
        // Active glow
        isActiveScale && scaleType === 'small' && 'border-c-blue shadow-glow-blue shadow-inner-blue',
        isActiveScale && scaleType === 'large' && 'border-c-purple shadow-glow-purple shadow-inner-purple',
        !isActiveScale && 'border-b-card opacity-75',
        'bg-gradient-to-br from-white/[0.018] via-transparent to-transparent bg-bg-card',
      )}
    >
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-block px-2 py-[3px] rounded text-[10px] font-extrabold uppercase tracking-[1.5px]',
              scaleType === 'small'
                ? 'bg-c-blue-dim text-c-blue-bright'
                : 'bg-c-purple-dim text-[var(--c-purple)]',
            )}
          >
            {BADGE_LABEL[scaleType]}
          </span>
          <span className="text-xs text-t-secondary font-medium">{RANGE_LABEL[scaleType]}</span>
        </div>
        <StabilityIndicator stable={stable} />
      </div>

      {/* ── Active material ────────────────────────────────────────────────── */}
      <div className="text-center font-medium text-sm text-t-secondary truncate">
        {currentMaterial ? currentMaterial.name : '— Bahan Material —'}
      </div>

      {/* ── Weight readout ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center py-2">
        <WeightDisplay weight={weight} target={target} scaleType={scaleType} />
      </div>

      {/* ── Target row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-xs font-extrabold uppercase tracking-widest text-t-muted">TARGET</span>
        <span
          className={cn(
            'font-mono text-lg font-bold',
            scaleType === 'small' ? 'text-c-blue' : 'text-[var(--c-purple)]',
          )}
        >
          {isActiveScale && target > 0 ? target.toFixed(2) : '--'}
        </span>
        <span className="text-sm text-t-secondary font-medium">kg</span>
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <ProgressBar weight={weight} target={target} scaleType={scaleType} />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-t-muted">{timestampText}</span>

        <button
          onClick={handleManualConfirm}
          disabled={!moData || !isActiveScale || autoConfirm}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-sm font-semibold',
            'transition-all duration-200',
            moData && isActiveScale && !autoConfirm
              ? [
                  scaleType === 'small'
                    ? 'border-c-blue text-c-blue bg-c-blue-dim hover:bg-c-blue hover:text-white hover:shadow-glow-blue'
                    : 'border-[var(--c-purple)] text-[var(--c-purple)] bg-c-purple-dim hover:bg-[var(--c-purple)] hover:text-white hover:shadow-glow-purple',
                ]
              : 'border-b-card text-t-muted bg-transparent cursor-not-allowed opacity-40',
          )}
        >
          <CheckCircle2 size={15} strokeWidth={2.5} />
          <span>Konfirmasi</span>
        </button>
      </div>
    </motion.section>
  );
});
