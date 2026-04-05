import type { DriftOutcome } from '../types/index.js';
export declare function fingerprint(content: string): string;
/**
 * Drift detection and invalidation:
 * - If plan.yaml exists and its source_md_fingerprint differs from currentFingerprint,
 *   archive derivatives to history and reset state to DRAFT.
 * - Returns a structured DriftOutcome instead of void/console.warn.
 */
export declare function checkAndInvalidateDrift(planDir: string, currentFingerprint: string): DriftOutcome;
export declare function derivePlan(projectRoot: string, planId?: string): Promise<string>;
//# sourceMappingURL=derive.d.ts.map