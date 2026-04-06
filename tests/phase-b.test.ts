import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closePlanCycle } from '../src/core/close.js';
import { createPlan } from '../src/core/create.js';
import { derivePlan } from '../src/core/derive.js';
import { observePlan } from '../src/core/observe.js';
import { getPlanDir } from '../src/core/resolver.js';
import { reviewPlan } from '../src/core/review.js';
import { readState, updateState } from '../src/core/state.js';
import { validatePlan } from '../src/core/validate.js';

let tmpDir: string;

function makeTmpDir(): string {
  const suffix = randomBytes(4).toString('hex');
  return join('/tmp', `plan-dope-test-pb-${suffix}`);
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
      // Ignore cleanup errors
    }
  }
});

describe('Fase B: Plan Vivo', () => {
  describe('closePlanCycle', () => {
    it('throws when trying to close a plan in state DRAFT', async () => {
      await createPlan(tmpDir, 'test-pb');
      await expect(closePlanCycle(tmpDir, 'test-pb')).rejects.toThrow('Cannot close plan in state');
    });

    it('throws when trying to close a plan in state DERIVED', async () => {
      await createPlan(tmpDir, 'test-pb');
      await derivePlan(tmpDir, 'test-pb');
      await expect(closePlanCycle(tmpDir, 'test-pb')).rejects.toThrow('Cannot close plan in state');
    });

    it('throws when trying to close a plan in state VALIDATED', async () => {
      await createPlan(tmpDir, 'test-pb');
      await derivePlan(tmpDir, 'test-pb');
      await validatePlan(tmpDir, 'test-pb');
      await expect(closePlanCycle(tmpDir, 'test-pb')).rejects.toThrow('Cannot close plan in state');
    });

    it('allows closing a plan in state HANDOFF_READY', async () => {
      await createPlan(tmpDir, 'test-pb');
      await derivePlan(tmpDir, 'test-pb');
      await validatePlan(tmpDir, 'test-pb');
      await reviewPlan(tmpDir, 'test-pb');

      // Forzamos HANDOFF_READY simulando que ya se aprobó el checkpoint
      updateState(getPlanDir(tmpDir, 'test-pb'), 'HANDOFF_READY');

      const cycleDir = await closePlanCycle(tmpDir, 'test-pb');
      expect(existsSync(cycleDir)).toBe(true);
      expect(readState(getPlanDir(tmpDir, 'test-pb')).state).toBe('DRAFT');
    });

    it('creates history/cycle-1/ with snapshots and updates cycle_index', async () => {
      await createPlan(tmpDir, 'test-pb');
      await derivePlan(tmpDir, 'test-pb');
      await validatePlan(tmpDir, 'test-pb');
      await reviewPlan(tmpDir, 'test-pb');

      const cycleDir = await closePlanCycle(tmpDir, 'test-pb');
      expect(existsSync(cycleDir)).toBe(true);
      expect(cycleDir).toMatch(/history\/cycle-1$/);

      expect(existsSync(join(cycleDir, 'plan.md'))).toBe(true);
      expect(existsSync(join(cycleDir, 'plan.yaml'))).toBe(true);
      expect(existsSync(join(cycleDir, 'review-report.md'))).toBe(true);
      expect(existsSync(join(cycleDir, 'validation-report.yaml'))).toBe(true);
      expect(existsSync(join(cycleDir, 'meta.json'))).toBe(true);

      // Sin observations/corrections previos, no deben existir en el snapshot
      expect(existsSync(join(cycleDir, 'observations.md'))).toBe(false);
      expect(existsSync(join(cycleDir, 'corrections-log.md'))).toBe(false);

      const planDir = getPlanDir(tmpDir, 'test-pb');
      const state = readState(planDir);

      // Debe actualizar cycle_index y transicionar a DRAFT
      expect(state.cycle_index).toBe(1);
      expect(state.state).toBe('DRAFT');
    });

    it('does not overwrite existing cycle-N directories on consecutive closures', async () => {
      await createPlan(tmpDir, 'test-pb');
      await derivePlan(tmpDir, 'test-pb');
      await validatePlan(tmpDir, 'test-pb');
      await reviewPlan(tmpDir, 'test-pb');

      const cycleDir1 = await closePlanCycle(tmpDir, 'test-pb');
      expect(cycleDir1).toMatch(/history\/cycle-1$/);

      // Ciclo 2
      // El state vuelve a DRAFT, lo volvemos a pasar legalmente por el pipeline
      const planPath = join(getPlanDir(tmpDir, 'test-pb'), 'plan.md');
      writeFileSync(planPath, `${readFileSync(planPath, 'utf8')}\n# Changed for c2`, 'utf8');

      await derivePlan(tmpDir, 'test-pb');
      await validatePlan(tmpDir, 'test-pb');
      await reviewPlan(tmpDir, 'test-pb');

      const cycleDir2 = await closePlanCycle(tmpDir, 'test-pb');
      expect(cycleDir2).toMatch(/history\/cycle-2$/);

      expect(existsSync(cycleDir1)).toBe(true);
      expect(existsSync(cycleDir2)).toBe(true);
      expect(cycleDir1).not.toBe(cycleDir2);
    });

    it('throws when review-report.md is missing', async () => {
      await createPlan(tmpDir, 'test-pb');
      await derivePlan(tmpDir, 'test-pb');
      await validatePlan(tmpDir, 'test-pb');
      await reviewPlan(tmpDir, 'test-pb');

      // Forzamos estado válido pero borramos el review-report
      const planDir = getPlanDir(tmpDir, 'test-pb');
      const { unlinkSync } = await import('node:fs');
      unlinkSync(join(planDir, 'review-report.md'));

      await expect(closePlanCycle(tmpDir, 'test-pb')).rejects.toThrow('review-report.md not found');
    });
  });

  describe('observe operations', () => {
    it('returns empty array when no comment or correction is provided', async () => {
      await createPlan(tmpDir, 'test-pb');
      const result = await observePlan(tmpDir, {}, 'test-pb');

      expect(result).toEqual([]);
      const planDir = getPlanDir(tmpDir, 'test-pb');
      expect(existsSync(join(planDir, 'observations.md'))).toBe(false);
      expect(existsSync(join(planDir, 'corrections-log.md'))).toBe(false);
    });

    it('appends raw comment to observations.md', async () => {
      await createPlan(tmpDir, 'test-pb');
      await observePlan(tmpDir, { comment: 'This is a manually injected observation' }, 'test-pb');

      const obsPath = join(getPlanDir(tmpDir, 'test-pb'), 'observations.md');
      expect(existsSync(obsPath)).toBe(true);

      const content = readFileSync(obsPath, 'utf8');
      expect(content).toContain('This is a manually injected observation');
    });

    it('appends structured correction to corrections-log.md', async () => {
      await createPlan(tmpDir, 'test-pb');

      // We simulate observe --correct called by cli
      await observePlan(
        tmpDir,
        { correct: 'Fixed finding assumptions', finding: 'review-abc123-def4:F-01' },
        'test-pb'
      );

      const logPath = join(getPlanDir(tmpDir, 'test-pb'), 'corrections-log.md');
      expect(existsSync(logPath)).toBe(true);

      const content = readFileSync(logPath, 'utf8');
      expect(content).toContain('Fixed finding assumptions');
      expect(content).toContain('finding: review-abc123-def4:F-01');
      expect(content).toMatch(
        /<!-- correction: .* fingerprint_before: .* finding: review-abc123-def4:F-01 -->/
      );
    });

    it('logs are physically removed (cleaned up) from top-level correctly post close', async () => {
      await createPlan(tmpDir, 'test-pb');
      await derivePlan(tmpDir, 'test-pb');
      await validatePlan(tmpDir, 'test-pb');
      await reviewPlan(tmpDir, 'test-pb');

      await observePlan(tmpDir, { comment: 'Obs 1' }, 'test-pb');
      await observePlan(
        tmpDir,
        { correct: 'Corr 1', finding: 'review-xyz789-abc1:F-02' },
        'test-pb'
      );

      const planDir = getPlanDir(tmpDir, 'test-pb');
      expect(existsSync(join(planDir, 'observations.md'))).toBe(true);
      expect(existsSync(join(planDir, 'corrections-log.md'))).toBe(true);

      const cycleDir = await closePlanCycle(tmpDir, 'test-pb');

      expect(existsSync(join(planDir, 'observations.md'))).toBe(false);
      expect(existsSync(join(planDir, 'corrections-log.md'))).toBe(false);

      expect(existsSync(join(cycleDir, 'observations.md'))).toBe(true);
      expect(existsSync(join(cycleDir, 'corrections-log.md'))).toBe(true);
    });
  });

  describe('readState validation', () => {
    it('throws when cycle_index is not a number', async () => {
      await createPlan(tmpDir, 'test-pb');

      const planDir = getPlanDir(tmpDir, 'test-pb');
      const statePath = join(planDir, '.state.json');

      // Corrupt the state file with a string cycle_index
      const state = JSON.parse(readFileSync(statePath, 'utf8'));
      state.cycle_index = 'abc';
      writeFileSync(statePath, JSON.stringify(state), 'utf8');

      expect(() => readState(planDir)).toThrow('cycle_index');
    });
  });

  describe('FAIL verdict', () => {
    it('transitions to DRAFT when review detects critical validation errors', async () => {
      await createPlan(tmpDir, 'fail-verdict-test');
      await derivePlan(tmpDir, 'fail-verdict-test');

      const planDir = getPlanDir(tmpDir, 'fail-verdict-test');
      writeFileSync(
        join(planDir, 'plan.yaml'),
        'plan_id: fail-verdict-test\nphases: not-an-array\nrisks: not-an-array\n',
        'utf-8'
      );

      await validatePlan(tmpDir, 'fail-verdict-test');
      await reviewPlan(tmpDir, 'fail-verdict-test');

      const state = readState(planDir);
      expect(state.state).toBe('DRAFT');
    });
  });
});
