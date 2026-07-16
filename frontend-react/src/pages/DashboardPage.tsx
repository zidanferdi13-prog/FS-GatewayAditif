import { useSocket } from '@/hooks/useSocket';
import { useRealtimeWeight } from '@/hooks/useRealtimeWeight';
import { useMODataListener } from '@/hooks/useMODataListener';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardScreen } from '@/components/dashboard/DashboardScreen';
import { MOInputModal } from '@/components/mo/MOInputModal';
import { MOConfirmModal } from '@/components/mo/MOConfirmModal';
import { ConfirmResetModal } from '@/components/modal/ConfirmResetModal';
import { OverloadAlertModal } from '@/components/modal/OverloadAlertModal';
import { LotCompleteToast } from '@/components/modal/LotCompleteToast';
import { CompletionModal } from '@/components/modal/CompletionModal';
import { SkipKemasanModal } from '@/components/modal/SkipKemasanModal';

/**
 * Root page that bootstraps all runtime hooks and composes the full dashboard.
 * All Socket.IO listeners are registered here via custom hooks.
 */
export function DashboardPage() {
  // Initialise socket connection + status listeners
  useSocket();

  // Subscribe to weight events and drive the weighing workflow
  useRealtimeWeight();

  // Listen for MO data response from server
  useMODataListener();

  return (
    <MainLayout>
      {/* ── Main working area ─────────────────────────────────────────────── */}
      <DashboardScreen />

      {/* ── Modals & Toasts ───────────────────────────────────────────────── */}
      <MOInputModal />
      <MOConfirmModal />
      <ConfirmResetModal />
      <OverloadAlertModal />
      <LotCompleteToast />
      <SkipKemasanModal />
      <CompletionModal />
    </MainLayout>
  );
}
