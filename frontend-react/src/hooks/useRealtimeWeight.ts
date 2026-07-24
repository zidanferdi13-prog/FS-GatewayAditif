import { useEffect, useCallback } from 'react';
import { socketService } from '@/services/socket';
import { useMOStore, selectExpectedScale } from '@/store/moStore';
import { useScaleStore } from '@/store/scaleStore';
import { useUIStore } from '@/store/uiStore';
import {
  shouldAutoConfirm,
  AUTO_CONFIRM_DELAY_MS,
  POST_CONFIRM_COOLDOWN_MS,
  formatWeight,
} from '@/utils/scaleUtils';
import type { WeightEvent } from '@/types';

/**
 * Subscribes to `weightData` Socket.IO events and drives the core
 * weighing workflow:
 *  - Updates scale weight / stability in the store
 *  - Opens MO input modal when weight detected with no active MO
 *  - Triggers overload alarm when weight exceeds target
 *  - Auto-confirms when stable weight equals target (rounded to 2 dp)
 */
export function useRealtimeWeight() {
  // ── Store actions ──────────────────────────────────────────────────────────
  const moStore        = useMOStore();
  const scaleStore     = useScaleStore();
  const { openModal, closeModal, setOverloadInfo } = useUIStore();

  // Re-read expectedScale on every render so the callback always sees fresh
  // values without needing to be re-registered on every state change.
  const getExpectedScale = useCallback(
    () => selectExpectedScale(useMOStore.getState()),
    [],
  );

  const handleConfirm = useCallback(
    (weight: number, target: number, scale: string, source: string) => {
      const {
        activeMO,
        moData,
        autoConfirmActive,
        currentRMIndex,
        materials,
        currentLot,
        setAutoConfirmActive,
        advanceRM,
      } = useMOStore.getState();

      if (!activeMO || !moData || autoConfirmActive) return;

      const rm = materials[currentRMIndex];
      if (!rm) return;

      setAutoConfirmActive(true);
      console.info(
        `[${source.toUpperCase()}] RM[${currentRMIndex}]: ${rm.name} | ${weight}/${target} kg | ${scale}`,
      );

      // Notify backend — insert weight record
      socketService.emit('print-confirm', {
        mo:         activeMO,
        lot:        currentLot,
        rm_index:   currentRMIndex,
        rm_name:    rm.name,
        scale_used: scale as 'small' | 'large',
        weight,
        target,
        timestamp:  new Date().toISOString(),
      });

      // Advance after delay (matches original 1.5 s behaviour)
      const completedLot = currentLot; // Capture before advance
      setTimeout(() => {
        setAutoConfirmActive(false);

        const result = useMOStore.getState().advanceRM();

        if (result === 'complete' || result === 'next_lot') {
          // Emit print-lot for the completed lot
          socketService.emit('print-lot', {
            mo:        activeMO,
            lot:       completedLot,
            timestamp: new Date().toISOString(),
          });
        }

        if (result === 'complete') {
          const { activeMO, totalLot } = useMOStore.getState();
          socketService.emit('mo-completed', {
            mo:             activeMO ?? '',
            lots_completed: totalLot,
            timestamp:      new Date().toISOString(),
          });
          openModal('completion');
          return;
        }

        if (result === 'next_lot') {
          const { currentLot: nextLot } = useMOStore.getState();
          useUIStore.getState().setLotComplete(completedLot, nextLot);
          openModal('lotComplete');
          setTimeout(() => closeModal('lotComplete'), 2600);
        }
      }, AUTO_CONFIRM_DELAY_MS);
    },
    [openModal, closeModal],
  );

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const onWeightData = (data: WeightEvent) => {
      const scale  = data.scale === 'large' ? 'large' : 'small';
      const weight = parseFloat(String(data.weight)) || 0;
      const stable = !!data.stable;

      // ── 1. Update store ────────────────────────────────────────────────────
      scaleStore.setWeight(scale, weight, stable, data.timestamp ?? new Date().toISOString());

      // ── 2. Prompt MO input when scale is first used ───────────────────────
      const { weightAboveZero, activeMO, setWeightAboveZero } = useMOStore.getState();
      if (weight > 0 && !weightAboveZero && !activeMO) {
        setWeightAboveZero(true);
        openModal('moInput');
      } else if (weight === 0) {
        setWeightAboveZero(false);
        scaleStore.setOverload(scale, false);
        closeModal('overload');
      }

      // ── 3. Overload alarm (only for the expected scale) ───────────────────
      const expected = getExpectedScale();
      const { materials, currentRMIndex } = useMOStore.getState();
      const target = materials[currentRMIndex]?.targetWeight ?? 0;
      const scaleState = useScaleStore.getState()[scale];

      if (scale === expected && target > 0) {
        if (weight > target && !scaleState.overloadShown) {
          scaleStore.setOverload(scale, true);
          setOverloadInfo(weight, target);
          openModal('overload');
        } else if (weight <= target && scaleState.overloadShown) {
          scaleStore.setOverload(scale, false);
          closeModal('overload');
        }
      }

      // ── 4. Auto-confirm (with cooldown after advance) ─────────────────────
      const { moData, autoConfirmActive, lastAdvanceTime } = useMOStore.getState();
      if (
        moData &&
        scale === expected &&
        !autoConfirmActive &&
        target > 0 &&
        Date.now() - lastAdvanceTime >= POST_CONFIRM_COOLDOWN_MS &&
        shouldAutoConfirm(weight, target, stable)
      ) {
        handleConfirm(weight, target, scale, 'auto');
      }
    };

    socket.on('weightData', onWeightData);

    return () => {
      socket.off('weightData', onWeightData);
    };
  }, [scaleStore, openModal, closeModal, setOverloadInfo, getExpectedScale, handleConfirm]);
}
