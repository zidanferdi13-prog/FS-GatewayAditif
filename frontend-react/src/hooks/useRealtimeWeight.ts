import { useEffect, useCallback } from 'react';
import { socketService } from '@/services/socket';
import { useMOStore, selectExpectedScale } from '@/store/moStore';
import { useScaleStore } from '@/store/scaleStore';
import { useUIStore } from '@/store/uiStore';
import { WEIGHT_TOLERANCE } from '@/utils/scaleUtils';
import type { WeightEvent } from '@/types';

/**
 * Subscribes to `weightData` Socket.IO events and drives the weighing
 * workflow:
 *  - Updates scale weight / stability in the store
 *  - Opens MO input modal when weight detected with no active MO
 *  - Triggers overload alarm when weight exceeds target
 *
 * Confirmation is manual — the operator presses the Konfirmasi button
 * once the weight reaches target (see ScalePanel).
 */
export function useRealtimeWeight() {
  // ── Store actions ──────────────────────────────────────────────────────────
  const scaleStore     = useScaleStore();
  const { openModal, closeModal, setOverloadInfo } = useUIStore();

  // Re-read expectedScale on every render so the callback always sees fresh
  // values without needing to be re-registered on every state change.
  const getExpectedScale = useCallback(
    () => selectExpectedScale(useMOStore.getState()),
    [],
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
        const overLimit = target * (1 + WEIGHT_TOLERANCE);
        if (weight > overLimit && !scaleState.overloadShown) {
          scaleStore.setOverload(scale, true);
          setOverloadInfo(weight, target);
          openModal('overload');
        } else if (weight <= overLimit && scaleState.overloadShown) {
          scaleStore.setOverload(scale, false);
          closeModal('overload');
        }
      }

    };

    socket.on('weightData', onWeightData);

    return () => {
      socket.off('weightData', onWeightData);
    };
  }, [scaleStore, openModal, closeModal, setOverloadInfo, getExpectedScale]);
}
