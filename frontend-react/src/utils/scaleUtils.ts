import type { ScaleType } from '@/types';

/** Maximum weight (kg) handled by the small scale */
export const SMALL_SCALE_MAX_KG = 20.0;

/** How long (ms) after confirm before advancing to next RM */
export const AUTO_CONFIRM_DELAY_MS = 3000;

/** How long (ms) after advancing to next RM before auto-confirm can fire again */
export const POST_CONFIRM_COOLDOWN_MS = 2000;
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
 * Get tolerance in kg based on target weight range.
 *
 * Target        | Tolerance
 * 0 – 500 g    | 1 g   (0.001 kg)
 * 500 – 1000 g | 2 g   (0.002 kg)
 * 1 – 5 kg     | 10 g  (0.01 kg)
 * > 5 kg       | 50 g  (0.05 kg)
 */
export function getToleranceKg(target: number): number {
  if (target <= 0.5)   return 0.001;   // 0 – 500 g
  if (target <= 1)     return 0.002;   // 500 – 1000 g
  if (target <= 5)     return 0.01;    // 1 – 5 kg
  return 0.05;                          // > 5 kg
}

/**
 * Returns true when weight is within tolerance of the target.
 * Accepts weight in range [target - toleranceKg, target + toleranceKg].
 */
export function shouldAutoConfirm(
  weight: number,
  target: number,
  stable: boolean,
): boolean {
  console.log(weight, target, stable, target - getToleranceKg(target), target + getToleranceKg(target))
  return stable && target > 0 && weight >= 0 &&
    weight >= target - getToleranceKg(target) &&
    weight <= target + getToleranceKg(target);
}

/** Format weight for display, always 2 decimal places */
export function formatWeight(value: number): string {
  return value.toFixed(2);
}
