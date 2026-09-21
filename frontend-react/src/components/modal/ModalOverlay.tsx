import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { cn } from '@/utils/cn';

interface ModalOverlayProps {
  isOpen:   boolean;
  onClose?: () => void;
  children: ReactNode;
  /** 'default' | 'alarm' (dark red tint for overload) */
  variant?: 'default' | 'alarm';
  /** Prevent close on backdrop click */
  persistent?: boolean;
  /** Kept for compatibility; modal now renders instantly */
  instant?: boolean;
}

/**
 * Simple modal overlay without entrance/exit animation.
 * This keeps rendering lightweight for operator-facing dashboards.
 */
export function ModalOverlay({
  isOpen,
  onClose,
  children,
  variant = 'default',
  persistent = false,
}: ModalOverlayProps) {
  useEffect(() => {
    if (!isOpen || persistent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, persistent]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        variant === 'alarm'
          ? 'bg-[rgba(90,5,5,0.85)]'
          : 'bg-[rgba(0,0,0,0.75)] backdrop-blur-sm',
      )}
      onClick={persistent ? undefined : () => onClose?.()}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
