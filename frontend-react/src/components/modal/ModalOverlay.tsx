import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ModalOverlayProps {
  isOpen:   boolean;
  onClose?: () => void;
  children: ReactNode;
  /** 'default' | 'alarm' (dark red tint for overload) */
  variant?: 'default' | 'alarm';
  /** Prevent close on backdrop click */
  persistent?: boolean;
  /** Skip entrance animation (appear instantly) */
  instant?: boolean;
}

/**
 * Reusable animated modal overlay.
 * Adds keyboard Escape support.
 */
export function ModalOverlay({
  isOpen,
  onClose,
  children,
  variant = 'default',
  persistent = false,
  instant = false,
}: ModalOverlayProps) {
  // Escape key
  useEffect(() => {
    if (!isOpen || persistent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, persistent]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="overlay"
          initial={instant ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: instant ? 0 : 0.18 }}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            variant === 'alarm'
              ? 'bg-[rgba(90,5,5,0.85)]'
              : 'bg-[rgba(0,0,0,0.75)] backdrop-blur-sm',
          )}
          onClick={persistent ? undefined : () => onClose?.()}
        >
          <motion.div
            key="dialog"
            initial={instant ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={instant ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 }}
            transition={instant ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
