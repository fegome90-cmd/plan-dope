import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closePlanCycle } from '../src/core/close.js';
import { createPlan } from '../src/core/create.js';
import { derivePlan } from '../src/core/derive.js';
import { getPlanDir } from '../src/core/resolver.js';
import { reviewPlan } from '../src/core/review.js';
import { validatePlan } from '../src/core/validate.js';

let tmpDir: string;

function makeTmpDir(): string {
  const suffix = randomBytes(4).toString('hex');
  return join('/tmp', `plan-dope-test-${suffix}`);
}

beforeEach(() => {
  tmpDir = makeTmpDir();
  mkdirSync(tmpDir, { recursive: true });
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
});

afterEach(() => {
  if (existsSync(tmpDir)) {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors in test teardown
    }
  }
});

async function setupReviewedPlan(tmpDir: string, id: string): Promise<string> {
  await createPlan(tmpDir, id);
  await derivePlan(tmpDir, id);
  await validatePlan(tmpDir, id);
  await reviewPlan(tmpDir, id);
  return id;
}

describe('closePlanCycle - legacy fallback', () => {
  it('parses review-report.md via regex when summary.json is missing', async () => {
    const id = await setupReviewedPlan(tmpDir, 'close-legacy-happy');

    // Resolve run-id dynamically from review_runs directory
    const reviewRunsDir = join(tmpDir, '_ctx', 'review_runs');
    const runDirs = readdirSync(reviewRunsDir);
    expect(runDirs.length).toBeGreaterThan(0);
    const runId = runDirs[0];

    // Delete summary.json to force legacy fallback path
    const summaryPath = join(reviewRunsDir, runId, 'summary.json');
    expect(existsSync(summaryPath)).toBe(true);
    rmSync(summaryPath);

    // Close the plan — should use regex fallback
    const cycleDir = await closePlanCycle(tmpDir, id);

    // Verify meta.json was created with regex-parsed values
    const meta = JSON.parse(readFileSync(join(cycleDir, 'meta.json'), 'utf-8'));
    expect(meta.review_run_id).toBe(runId);
    expect(meta.review_run_id).not.toBe('unknown');
    expect(meta.plan_md_fingerprint).not.toBe('unknown');
    expect(['PASS', 'PASS_WITH_NOTES', 'FAIL']).toContain(meta.final_verdict);
  });

  it('throws when review-report.md has no Verdict row in legacy fallback', async () => {
    const id = 'close-legacy-no-verdict';
    await createPlan(tmpDir, id);
    await derivePlan(tmpDir, id);
    await validatePlan(tmpDir, id);
    await reviewPlan(tmpDir, id);

    const planDir = getPlanDir(tmpDir, id);

    // Overwrite review-report.md with partial table (only Run ID, no Verdict)
    const partialReport = [
      '# Review Report: close-legacy-no-verdict',
      '',
      '## Summary',
      '',
      '| Field | Value |',
      '|-------|-------|',
      '| Run ID | review-no-verdict-001 |',
      '| Plan Fingerprint | abc123 |',
      '',
    ].join('\n');
    writeFileSync(join(planDir, 'review-report.md'), partialReport, 'utf-8');

    await expect(closePlanCycle(tmpDir, id)).rejects.toThrow(
      /Cannot extract Verdict from review-report.md/
    );
  });

  it('throws when review-report.md has no Fingerprint row in legacy fallback', async () => {
    const id = 'close-legacy-no-fp';
    await createPlan(tmpDir, id);
    await derivePlan(tmpDir, id);
    await validatePlan(tmpDir, id);
    await reviewPlan(tmpDir, id);

    const planDir = getPlanDir(tmpDir, id);

    // Overwrite review-report.md with partial table (Run ID + Verdict, no Fingerprint)
    const partialReport = [
      '# Review Report: close-legacy-no-fp',
      '',
      '## Summary',
      '',
      '| Field | Value |',
      '|-------|-------|',
      '| Run ID | review-no-fp-001 |',
      '| Verdict | **PASS** |',
      '',
    ].join('\n');
    writeFileSync(join(planDir, 'review-report.md'), partialReport, 'utf-8');

    await expect(closePlanCycle(tmpDir, id)).rejects.toThrow(
      /Cannot extract Plan Fingerprint from review-report.md/
    );
  });

  it('throws when summary.json exists but is corrupt', async () => {
    const id = await setupReviewedPlan(tmpDir, 'close-legacy-corrupt');

    const reviewRunsDir = join(tmpDir, '_ctx', 'review_runs');
    const runDirs = readdirSync(reviewRunsDir);
    const summaryPath = join(reviewRunsDir, runDirs[0], 'summary.json');

    // Corrupt the summary.json
    writeFileSync(summaryPath, '{bad', 'utf-8');

    await expect(closePlanCycle(tmpDir, id)).rejects.toThrow(/exists but is corrupt/);
  });

  it('throws when summary.json has invalid shape', async () => {
    const id = await setupReviewedPlan(tmpDir, 'close-legacy-bad-shape');

    const reviewRunsDir = join(tmpDir, '_ctx', 'review_runs');
    const runDirs = readdirSync(reviewRunsDir);
    const summaryPath = join(reviewRunsDir, runDirs[0], 'summary.json');

    // Write valid JSON but missing required fields
    writeFileSync(summaryPath, JSON.stringify({ run_id: 123, verdict: true }), 'utf-8');

    await expect(closePlanCycle(tmpDir, id)).rejects.toThrow(/has invalid shape/);
  });

  it('throws when required snapshot file is missing', async () => {
    const id = await setupReviewedPlan(tmpDir, 'close-missing-snapshot');

    const planDir = getPlanDir(tmpDir, id);

    // Delete validation-report.yaml to trigger the required file check
    rmSync(join(planDir, 'validation-report.yaml'));

    await expect(closePlanCycle(tmpDir, id)).rejects.toThrow(
      /Required snapshot file 'validation-report.yaml' not found/
    );
  });
});
