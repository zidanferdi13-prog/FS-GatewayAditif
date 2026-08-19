import type { ScaleType } from '@/types';

/** Maximum weight (kg) handled by the small scale */
export const SMALL_SCALE_MAX_KG = 20.0;

/** How long (ms) after confirm before advancing to next RM */
export const AUTO_CONFIRM_DELAY_MS = 3000;

/** Symmetric tolerance (±1%) around target — green colour + confirm window */
export const WEIGHT_TOLERANCE = 0.02;

export const SKIP_KEMASAN_DELAY_MS = 3000;

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
 *  - over   > target + tol  (red)
 *  - ok     within ± tol    (green — at/around target)
 *  - near   ≥ 90%           (amber warning)
 *  - normal < 90%
 */
export function getProgressState(ratio: number): ProgressState {
  if (ratio > 1 + WEIGHT_TOLERANCE) return 'over';
  if (ratio >= 1 - WEIGHT_TOLERANCE) return 'ok';
  if (ratio >= 0.9)  return 'near';
  return 'normal';
}

/** Format weight for display, always 2 decimal places */
export function formatWeight(value: number): string {
  return value.toFixed(2);
}
