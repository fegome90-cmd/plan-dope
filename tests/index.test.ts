import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { createPlan } from '../src/core/create.js';
import { derivePlan } from '../src/core/derive.js';
import { validatePlan } from '../src/core/validate.js';
import { reviewPlan } from '../src/core/review.js';
import { createCheckpoint } from '../src/core/checkpoint.js';
import { readState } from '../src/core/state.js';
import { resolveProjectRoot, findPlanId, getPlanDir } from '../src/core/resolver.js';

let tmpDir: string;

function makeTmpDir(): string {
  const suffix = randomBytes(4).toString('hex');
  return join('/tmp', `plan-dope-test-${suffix}`);
}

beforeEach(() => {
  tmpDir = makeTmpDir();
  mkdirSync(tmpDir, { recursive: true });
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

describe('resolveProjectRoot', () => {
  it('returns cwd when no path given', () => {
    const root = resolveProjectRoot();
    expect(root).toBe(process.cwd());
  });

  it('resolves explicit path', () => {
    const root = resolveProjectRoot(tmpDir);
    expect(root).toBe(tmpDir);
  });

  it('throws on non-existent path', () => {
    expect(() => resolveProjectRoot('/nonexistent/path-xyz-123')).toThrow('Project path does not exist');
  });
});

describe('createPlan', () => {
  it('creates plan.md with template content', async () => {
    const path = await createPlan(tmpDir, 'test-001');
    expect(existsSync(path)).toBe(true);
    expect(path).toContain('plan.md');
  });

  it('creates .state.json in DRAFT state', async () => {
    await createPlan(tmpDir, 'test-001');
    const state = readState(getPlanDir(tmpDir, 'test-001'));
    expect(state.state).toBe('DRAFT');
    expect(state.plan_id).toBe('test-001');
  });

  it('throws if plan already exists', async () => {
    await createPlan(tmpDir, 'test-001');
    await expect(createPlan(tmpDir, 'test-001')).rejects.toThrow('already exists');
  });

  it('auto-generates id when not provided', async () => {
    const path = await createPlan(tmpDir);
    expect(path).toContain('plan-');
  });
});

describe('derivePlan', () => {
  it('creates plan.yaml from plan.md', async () => {
    await createPlan(tmpDir, 'test-001');
    const yamlPath = await derivePlan(tmpDir, 'test-001');
    expect(existsSync(yamlPath)).toBe(true);
    expect(yamlPath).toContain('plan.yaml');
  });

  it('updates state to DERIVED', async () => {
    await createPlan(tmpDir, 'test-001');
    await derivePlan(tmpDir, 'test-001');
    const state = readState(getPlanDir(tmpDir, 'test-001'));
    expect(state.state).toBe('DERIVED');
  });

  it('throws if plan.md not found', async () => {
    await expect(derivePlan(tmpDir, 'nonexistent')).rejects.toThrow('not found');
  });
});

describe('validatePlan', () => {
  it('creates validation-report.yaml', async () => {
    await createPlan(tmpDir, 'test-001');
    await derivePlan(tmpDir, 'test-001');
    const reportPath = await validatePlan(tmpDir, 'test-001');
    expect(existsSync(reportPath)).toBe(true);
    expect(reportPath).toContain('validation-report.yaml');
  });

  it('updates state to VALIDATED when valid', async () => {
    await createPlan(tmpDir, 'test-001');
    await derivePlan(tmpDir, 'test-001');
    await validatePlan(tmpDir, 'test-001');
    const state = readState(getPlanDir(tmpDir, 'test-001'));
    expect(state.state).toBe('VALIDATED');
  });

  it('throws if plan.yaml not found', async () => {
    await createPlan(tmpDir, 'test-001');
    await expect(validatePlan(tmpDir, 'test-001')).rejects.toThrow('plan.yaml not found');
  });
});

describe('reviewPlan', () => {
  it('creates review-report.md', async () => {
    await createPlan(tmpDir, 'test-001');
    await derivePlan(tmpDir, 'test-001');
    await validatePlan(tmpDir, 'test-001');
    const reportPath = await reviewPlan(tmpDir, 'test-001');
    expect(existsSync(reportPath)).toBe(true);
    expect(reportPath).toContain('review-report.md');
  });

  it('creates review_runs directory', async () => {
    await createPlan(tmpDir, 'test-001');
    await derivePlan(tmpDir, 'test-001');
    await validatePlan(tmpDir, 'test-001');
    await reviewPlan(tmpDir, 'test-001');
    const reviewRunsDir = join(tmpDir, '_ctx', 'review_runs');
    expect(existsSync(reviewRunsDir)).toBe(true);
  });

  it('updates state to REVIEWED on PASS_WITH_NOTES', async () => {
    await createPlan(tmpDir, 'test-001');
    await derivePlan(tmpDir, 'test-001');
    await validatePlan(tmpDir, 'test-001');
    await reviewPlan(tmpDir, 'test-001');
    const state = readState(getPlanDir(tmpDir, 'test-001'));
    expect(state.state).toBe('REVIEWED');
  });

  it('throws if validation-report.yaml not found', async () => {
    await createPlan(tmpDir, 'test-001');
    await derivePlan(tmpDir, 'test-001');
    await expect(reviewPlan(tmpDir, 'test-001')).rejects.toThrow('validation-report.yaml not found');
  });
});

describe('createCheckpoint', () => {
  it('creates checkpoint file', async () => {
    await createPlan(tmpDir, 'test-001');
    await derivePlan(tmpDir, 'test-001');
    await validatePlan(tmpDir, 'test-001');
    await reviewPlan(tmpDir, 'test-001');
    const checkpointPath = await createCheckpoint(tmpDir, 'test-001', 'transfer');
    expect(existsSync(checkpointPath)).toBe(true);
    expect(checkpointPath).toContain('checkpoint_');
    expect(checkpointPath).toContain('.md');
  });

  it('updates state to HANDOFF_READY', async () => {
    await createPlan(tmpDir, 'test-001');
    await derivePlan(tmpDir, 'test-001');
    await validatePlan(tmpDir, 'test-001');
    await reviewPlan(tmpDir, 'test-001');
    await createCheckpoint(tmpDir, 'test-001', 'transfer');
    const state = readState(getPlanDir(tmpDir, 'test-001'));
    expect(state.state).toBe('HANDOFF_READY');
  });

  it('throws if plan is not REVIEWED', async () => {
    await createPlan(tmpDir, 'test-001');
    await expect(createCheckpoint(tmpDir, 'test-001', 'transfer')).rejects.toThrow("must be 'REVIEWED'");
  });
});

describe('findPlanId', () => {
  it('returns explicit plan id when provided', async () => {
    await createPlan(tmpDir, 'explicit-001');
    const id = findPlanId(tmpDir, 'explicit-001');
    expect(id).toBe('explicit-001');
  });

  it('throws when explicit plan does not exist', () => {
    expect(() => findPlanId(tmpDir, 'nonexistent')).toThrow('not found');
  });

  it('finds most recent plan when no id provided', async () => {
    await createPlan(tmpDir, 'plan-aaa');
    await createPlan(tmpDir, 'plan-zzz');
    const id = findPlanId(tmpDir);
    expect(id).toBe('plan-zzz');
  });

  it('throws when no plans exist', () => {
    expect(() => findPlanId(tmpDir)).toThrow('No plans found');
  });
});

describe('full pipeline', () => {
  it('completes all 5 steps successfully', async () => {
    // Step 1: Create
    const planPath = await createPlan(tmpDir, 'full-test');
    expect(existsSync(planPath)).toBe(true);

    // Step 2: Derive
    const yamlPath = await derivePlan(tmpDir, 'full-test');
    expect(existsSync(yamlPath)).toBe(true);

    // Step 3: Validate
    const validationPath = await validatePlan(tmpDir, 'full-test');
    expect(existsSync(validationPath)).toBe(true);

    // Step 4: Review
    const reviewPath = await reviewPlan(tmpDir, 'full-test');
    expect(existsSync(reviewPath)).toBe(true);

    // Step 5: Checkpoint
    const checkpointPath = await createCheckpoint(tmpDir, 'full-test', 'completion');
    expect(existsSync(checkpointPath)).toBe(true);

    // Verify final state
    const state = readState(getPlanDir(tmpDir, 'full-test'));
    expect(state.state).toBe('HANDOFF_READY');
  });
});
