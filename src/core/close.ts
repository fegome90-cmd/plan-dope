import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CycleMeta, ReviewVerdict } from '../types/index.js';
import { resolveArtifactsBasePath } from './config.js';
import { findPlanId, getPlanDir } from './resolver.js';
import { readState } from './state.js';
import { now } from './utils.js';

const REVIEW_VERDICTS: readonly string[] = ['PASS', 'PASS_WITH_NOTES', 'FAIL'];

interface ReviewSummary {
  run_id: string;
  plan_id: string;
  plan_md_fingerprint: string;
  verdict: ReviewVerdict;
  reviewed_at: string;
}

export async function closePlanCycle(projectRoot: string, planId?: string): Promise<string> {
  const artifactsBase = resolveArtifactsBasePath(projectRoot);
  const id = findPlanId(projectRoot, planId, artifactsBase);
  const planDir = getPlanDir(projectRoot, id, artifactsBase);

  const state = readState(planDir);

  if (state.state !== 'REVIEWED' && state.state !== 'HANDOFF_READY') {
    throw new Error(
      `Cannot close plan in state '${state.state}'. Must be 'REVIEWED' or 'HANDOFF_READY'.`
    );
  }

  const reviewReportPath = join(planDir, 'review-report.md');
  if (!existsSync(reviewReportPath)) {
    throw new Error('Cannot close plan: review-report.md not found.');
  }

  // Read structured summary.json first (source: review run artifact for runtime consumption).
  // If missing, fall back to regex parsing of review-report.md for legacy runs.
  // If summary.json exists but is corrupt, fail closed — do not silently degrade.
  const reviewContent = readFileSync(reviewReportPath, 'utf-8');
  const runIdMatch = reviewContent.match(/\| Run ID \| (.*?) \|/);
  const runId = runIdMatch?.[1]?.trim() ?? 'unknown';

  let summary: ReviewSummary;

  if (runId !== 'unknown') {
    const summaryPath = join(projectRoot, artifactsBase, 'review_runs', runId, 'summary.json');
    if (existsSync(summaryPath)) {
      try {
        const raw = readFileSync(summaryPath, 'utf-8');
        const parsed: unknown = JSON.parse(raw);
        if (
          parsed === null ||
          typeof parsed !== 'object' ||
          !('run_id' in parsed) ||
          typeof parsed.run_id !== 'string' ||
          !('verdict' in parsed) ||
          typeof parsed.verdict !== 'string' ||
          !REVIEW_VERDICTS.includes(parsed.verdict) ||
          !('plan_md_fingerprint' in parsed) ||
          typeof parsed.plan_md_fingerprint !== 'string'
        ) {
          throw new Error(
            `summary.json for run '${runId}' has invalid shape. ` +
              `Required: run_id (string), verdict (${REVIEW_VERDICTS.join(' | ')}), plan_md_fingerprint (string). ` +
              `Cannot close plan.`
          );
        }
        summary = parsed as ReviewSummary;
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('summary.json for run')) {
          throw err;
        }
        throw new Error(
          `summary.json for run '${runId}' exists but is corrupt. Cannot close plan.`
        );
      }
    } else {
      // Legacy path: parse review-report.md markdown table
      const verdictMatch = reviewContent.match(/\| Verdict \| \*\*(.*?)\*\* \|/);
      if (!verdictMatch?.[1]?.trim()) {
        throw new Error(
          'Cannot extract Verdict from review-report.md. ' +
            'Ensure the report contains a "| Verdict | **...** |" row. Cannot close plan.'
        );
      }
      const verdict = verdictMatch[1].trim();
      if (!REVIEW_VERDICTS.includes(verdict)) {
        throw new Error(
          `Invalid verdict '${verdict}' in review-report.md. ` +
            `Expected one of: ${REVIEW_VERDICTS.join(', ')}. Cannot close plan.`
        );
      }

      const fpMatch = reviewContent.match(/\| Plan Fingerprint \| (.*?) \|/);
      if (!fpMatch?.[1]?.trim()) {
        throw new Error(
          'Cannot extract Plan Fingerprint from review-report.md. ' +
            'Ensure the report contains a "| Plan Fingerprint | ... |" row. Cannot close plan.'
        );
      }

      summary = {
        run_id: runId,
        plan_id: id,
        plan_md_fingerprint: fpMatch[1].trim(),
        verdict: verdict as ReviewVerdict,
        reviewed_at: now(),
      };
    }
  } else {
    throw new Error('Cannot extract Run ID from review-report.md. Cannot close plan.');
  }

  const nextCycleIndex = (state.cycle_index ?? 0) + 1;
  const cycleDir = join(planDir, 'history', `cycle-${nextCycleIndex}`);

  mkdirSync(cycleDir, { recursive: true });

  const requiredFiles = [
    'plan.md',
    'plan.yaml',
    'validation-report.yaml',
    'review-report.md',
  ] as const;

  const optionalFiles = ['observations.md', 'corrections-log.md'] as const;

  for (const file of requiredFiles) {
    const src = join(planDir, file);
    if (!existsSync(src)) {
      throw new Error(
        `Required snapshot file '${file}' not found in plan directory. Cannot close plan.`
      );
    }
    copyFileSync(src, join(cycleDir, file));
  }

  for (const file of optionalFiles) {
    const src = join(planDir, file);
    if (existsSync(src)) {
      copyFileSync(src, join(cycleDir, file));
    }
  }

  const meta: CycleMeta = {
    cycle_index: nextCycleIndex,
    closed_at: now(),
    plan_md_fingerprint: summary.plan_md_fingerprint,
    final_verdict: summary.verdict,
    review_run_id: summary.run_id,
  };

  writeFileSync(join(cycleDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

  // Clear tracking files
  if (existsSync(join(planDir, 'observations.md'))) {
    rmSync(join(planDir, 'observations.md'));
  }
  if (existsSync(join(planDir, 'corrections-log.md'))) {
    rmSync(join(planDir, 'corrections-log.md'));
  }

  // Update state to DRAFT for the next cycle
  const updatedState = {
    ...state,
    state: 'DRAFT' as const,
    cycle_index: nextCycleIndex,
    updated_at: now(),
  };
  writeFileSync(join(planDir, '.state.json'), JSON.stringify(updatedState, null, 2), 'utf-8');

  return cycleDir;
}
