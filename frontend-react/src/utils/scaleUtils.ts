import type { ScaleType } from '@/types';

/** Maximum weight (kg) handled by the small scale */
export const SMALL_SCALE_MAX_KG = 20.0;

/** How long (ms) after confirm before advancing to next RM */
export const AUTO_CONFIRM_DELAY_MS = 1500;

/**
 * Determine which physical scale should handle the given target weight.
 * Business rule: target ≤ 2 kg → small scale; target > 2 kg → large scale.
 */
export function getScaleForWeight(targetKg: number): ScaleType {
  return targetKg <= SMALL_SCALE_MAX_KG ? 'small' : 'large';
}

/** Visual progress ratio capped at 1.1 so the bar never overflows wildly */
export function calcProgressRatio(weight: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(weight / target, 1.1);
}

export type ProgressState = 'normal' | 'near' | 'ok' | 'over';

/**
 * Classify current fill state for colour coding.
 * Fixed ordering vs original code (original had dead `is-ok` branch).
 *  - over  ≥ 100%
 *  - ok    ≥ 98%  (weight very close to / at target)
 *  - near  ≥ 90%  (amber warning)
 *  - normal < 90%
 */
export function getProgressState(ratio: number): ProgressState {
  if (ratio >= 1.0) return 'over';
  if (ratio >= 0.98) return 'ok';
  if (ratio >= 0.9)  return 'near';
  return 'normal';
}

/**
 * Round weight to 2 decimal places (same precision used in auto-confirm).
 * Uses Math.round to avoid floating-point drift.
 */
export function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Returns true when the weight should trigger an auto-confirm.
 * Mirrors the original condition: stable && roundedWeight === roundedTarget
 */
export function shouldAutoConfirm(
  weight: number,
  target: number,
  stable: boolean,
): boolean {
  return stable && target > 0 && roundWeight(weight) === roundWeight(target);
}

/** Format weight for display, always 2 decimal places */
export function formatWeight(value: number): string {
  return value.toFixed(2);
}
