import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { Toast } from '@/types';

const TOAST_STYLE: Record<Toast['type'], { icon: typeof Info; accent: string }> = {
  success: { icon: CheckCircle2, accent: 'text-c-green' },
  error:   { icon: XCircle,       accent: 'text-c-red' },
  warning: { icon: AlertTriangle, accent: 'text-c-amber' },
  info:    { icon: Info,          accent: 'text-c-blue' },
};

export function ToastContainer() {
  const toasts  = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const { icon: Icon, accent } = TOAST_STYLE[t.type];
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="flex items-start gap-3 px-4 py-3 rounded-lg border border-b-card bg-bg-card shadow-2xl text-left
                       hover:border-c-blue transition-colors"
          >
            <Icon size={20} className={`shrink-0 mt-0.5 ${accent}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-t-primary">{t.title}</div>
              {t.message && (
                <div className="text-xs text-t-secondary mt-0.5 break-words">{t.message}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
