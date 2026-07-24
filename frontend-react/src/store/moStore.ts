import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { MOData, Material, ScaleType } from '@/types';
import { getScaleForWeight } from '@/utils/scaleUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AdvanceResult = 'next_rm' | 'next_lot' | 'complete';

interface MOStoreState {
  // ── State ──────────────────────────────────────────────────────────────────
  activeMO:          string | null;
  moData:            MOData | null;
  materials:         Material[];
  currentRMIndex:    number;
  currentLot:        number;
  totalLot:          number;
  autoConfirmActive: boolean;
  weightAboveZero:   boolean;
  lastAdvanceTime:   number; // timestamp ms when last advanceRM ran

  // ── Actions ────────────────────────────────────────────────────────────────
  setActiveMO:           (mo: string) => void;
  confirmMOData:         (data: MOData) => void;
  resetMO:               () => void;
  /** Advance to the next RM (or lot, or signal completion) */
  advanceRM:             () => AdvanceResult;
  setAutoConfirmActive:  (active: boolean) => void;
  setWeightAboveZero:    (above: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useMOStore = create<MOStoreState>()(
  devtools(
    (set, get) => ({
      activeMO:          null,
      moData:            null,
      materials:         [],
      currentRMIndex:    0,
      currentLot:        0,
      totalLot:          0,
      autoConfirmActive: false,
      weightAboveZero:   false,
      lastAdvanceTime:   0,

      setActiveMO: (mo) => set({ activeMO: mo }),

      confirmMOData: (data) => {
        const materials: Material[] = data.produk_rm_items.map((name, i) => {
          const tw = parseFloat(data.target_weights[i]) || 0;
          return {
            name,
            targetWeight: tw,
            quantity:     data.produk_rm_qty[i] ?? 1,
            scaleType:    getScaleForWeight(tw),
            kategori:     data.produk_rm_kategori?.[i] ?? '',
          };
        });

        // Server already sorted by antrian_rm — trust the order
        set({
          moData:         data,
          materials,
          currentRMIndex: data.current_rm ?? 0,
          currentLot:     data.lot ?? 1,
          totalLot:       data.qty_plan,
        });
      },

      resetMO: () =>
        set({
          activeMO:          null,
          moData:            null,
          materials:         [],
          currentRMIndex:    0,
          currentLot:        0,
          totalLot:          0,
          autoConfirmActive: false,
          weightAboveZero:   false,
          lastAdvanceTime:   0,
        }),

      advanceRM: (): AdvanceResult => {
        const { currentRMIndex, materials, currentLot, totalLot } = get();
        const nextRM = currentRMIndex + 1;

        // Still more RMs left in this lot
        if (nextRM < materials.length) {
          set({ currentRMIndex: nextRM, lastAdvanceTime: Date.now() });
          return 'next_rm';
        }

        // End of lot — advance to next lot
        const nextLot = currentLot + 1;
        if (nextLot > totalLot) {
          // All lots done
          set({ currentRMIndex: 0, currentLot: nextLot, lastAdvanceTime: Date.now() });
          return 'complete';
        }

        set({ currentRMIndex: 0, currentLot: nextLot, lastAdvanceTime: Date.now() });
        return 'next_lot';
      },

      setAutoConfirmActive: (active) => set({ autoConfirmActive: active }),
      setWeightAboveZero:   (above)  => set({ weightAboveZero:  above  }),
    }),
    { name: 'mo-store' },
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// Selectors (use these in components to avoid unnecessary re-renders)
// ─────────────────────────────────────────────────────────────────────────────

/** Current active material (or null when MO not loaded) */
export const selectCurrentMaterial = (s: MOStoreState): Material | null =>
  s.materials[s.currentRMIndex] ?? null;

/** Which scale the current RM should use */
export const selectExpectedScale = (s: MOStoreState): ScaleType => {
  const mat = s.materials[s.currentRMIndex];
  return mat ? getScaleForWeight(mat.targetWeight) : 'small';
};
