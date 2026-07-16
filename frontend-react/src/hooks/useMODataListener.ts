import { useEffect, useCallback } from 'react';
import { socketService } from '@/services/socket';
import { useMOStore } from '@/store/moStore';
import { useUIStore } from '@/store/uiStore';
import type { MODataResponse } from '@/services/socket';

/**
 * Listens for `mo-data-confirm` from the server (response to `mo-confirmed`)
 * and opens the MO confirmation dialog with the returned data.
 */
export function useMODataListener() {
  const handleMODataConfirm = useCallback(
    (response: { success: boolean; data?: MODataResponse; error?: string }) => {
      const ui = useUIStore.getState();
      ui.setMoInputLoading(false);

      if (response.success && response.data) {
        // Store a temporary reference so MOConfirmModal can access it
        window.__tempMOData = response.data as never;
        ui.closeModal('moInput');
        ui.openModal('moConfirm');
      } else {
        console.error('MO API Error:', response.error);
        ui.showToast({
          type:     'error',
          title:    'Gagal Memuat MO',
          message:  response.error ?? 'Periksa nomor MO dan coba lagi',
          duration: 4000,
        });
      }
    },
    [],
  );

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    socket.on('mo-data-confirm', handleMODataConfirm);
    return () => {
      socket.off('mo-data-confirm', handleMODataConfirm);
    };
  }, [handleMODataConfirm]);
}

// Extend window type for temp MO data (avoids module augmentation complexity)
declare global {
  interface Window {
    __tempMOData?: unknown;
  }
}
