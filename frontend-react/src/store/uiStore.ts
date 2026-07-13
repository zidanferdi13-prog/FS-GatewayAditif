import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ModalId, Toast, Theme } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UIStoreState {
  // ── Modals ─────────────────────────────────────────────────────────────────
  openModals: Set<ModalId>;

  // ── Toasts ─────────────────────────────────────────────────────────────────
  toasts: Toast[];

  // ── Theme ──────────────────────────────────────────────────────────────────
  theme: Theme;

  // ── Overload info (for the alarm modal) ───────────────────────────────────
  overloadWeight: number;
  overloadTarget: number;

  // ── Lot-complete toast info ────────────────────────────────────────────────
  completedLot: number;
  nextLot:      number;

  // ── Actions ────────────────────────────────────────────────────────────────
  openModal:        (id: ModalId) => void;
  closeModal:       (id: ModalId) => void;
  isModalOpen:      (id: ModalId) => boolean;
  showToast:        (toast: Omit<Toast, 'id'>) => void;
  dismissToast:     (id: string) => void;
  setOverloadInfo:  (weight: number, target: number) => void;
  setLotComplete:   (completed: number, next: number) => void;
  toggleTheme:      () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStoreState>()(
  devtools(
    (set, get) => ({
      openModals:     new Set<ModalId>(),
      toasts:         [],
      theme:          'light',
      overloadWeight: 0,
      overloadTarget: 0,
      completedLot:   0,
      nextLot:        0,

      openModal: (id) =>
        set((s) => ({ openModals: new Set([...s.openModals, id]) })),

      closeModal: (id) =>
        set((s) => {
          const next = new Set(s.openModals);
          next.delete(id);
          return { openModals: next };
        }),

      isModalOpen: (id) => get().openModals.has(id),

      showToast: (toast) => {
        const id = crypto.randomUUID();
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));

        // Auto-dismiss unless duration is 0 (persistent)
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().dismissToast(id);
          }, toast.duration ?? 3000);
        }
      },

      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setOverloadInfo: (weight, target) =>
        set({ overloadWeight: weight, overloadTarget: target }),

      setLotComplete: (completed, next) =>
        set({ completedLot: completed, nextLot: next }),

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'ui-store' },
  ),
);
