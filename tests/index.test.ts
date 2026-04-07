import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { closePlanCycle } from '../src/core/close.js';
import { createCheckpoint } from '../src/core/checkpoint.js';
import {
  readGlobalConfig,
  readProjectOverride,
  resolveArtifactsBasePath,
  resolveConfig,
  writeGlobalConfig,
} from '../src/core/config.js';
import { createPlan } from '../src/core/create.js';
import { checkAndInvalidateDrift, derivePlan, fingerprint } from '../src/core/derive.js';
import { isGitRepo } from '../src/core/git.js';
import { findPlanId, getPlanDir, resolveProjectRoot } from '../src/core/resolver.js';
import { reviewPlan } from '../src/core/review.js';
import { readState, validateStateTransition } from '../src/core/state.js';
import { validatePlan } from '../src/core/validate.js';
import type { DriftOutcome } from '../src/types/index.js';

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

describe('resolveProjectRoot', () => {
  it('returns cwd when no path given', () => {
    const root = resolveProjectRoot();
    expect(root).toBe(process.cwd());
  });

  it('resolves explicit path', () => {
    const root = resolveProjectRoot(tmpDir);
    // git rev-parse --show-toplevel resolves symlinks (e.g. /tmp → /private/tmp on macOS)
    expect(root).toBe(realpathSync(tmpDir));
  });

  it('throws on non-existent path', () => {
    expect(() => resolveProjectRoot('/nonexistent/path-xyz-123')).toThrow(
      'Project path does not exist'
    );
  });

  it('throws when path is not a git repository', () => {
    const noGitDir = join('/tmp', `plan-dope-no-git-resolver-${randomBytes(4).toString('hex')}`);
    mkdirSync(noGitDir, { recursive: true });
    try {
      expect(() => resolveProjectRoot(noGitDir)).toThrow('Not a git repository');
    } finally {
      rmSync(noGitDir, { recursive: true, force: true });
    }
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
    await expect(reviewPlan(tmpDir, 'test-001')).rejects.toThrow(
      'validation-report.yaml not found'
    );
  });

  it('throws if plan.yaml fingerprint does not match plan.md', async () => {
    await createPlan(tmpDir, 'fp-mismatch-review');
    await derivePlan(tmpDir, 'fp-mismatch-review');
    await validatePlan(tmpDir, 'fp-mismatch-review');
    // Modify plan.md after derive to cause fingerprint mismatch
    const planPath = join(getPlanDir(tmpDir, 'fp-mismatch-review'), 'plan.md');
    writeFileSync(planPath, `${readFileSync(planPath, 'utf-8')}\n# Modified after derive`, 'utf-8');
    await expect(reviewPlan(tmpDir, 'fp-mismatch-review')).rejects.toThrow('fingerprint mismatch');
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
    await expect(createCheckpoint(tmpDir, 'test-001', 'transfer')).rejects.toThrow(
      "must be 'REVIEWED'"
    );
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

describe('isGitRepo', () => {
  it('returns true for valid git repository', () => {
    expect(isGitRepo(tmpDir)).toBe(true);
  });

  it('returns false for directory without git', () => {
    const noGitDir = join('/tmp', `plan-dope-no-git-${randomBytes(4).toString('hex')}`);
    mkdirSync(noGitDir, { recursive: true });
    try {
      expect(isGitRepo(noGitDir)).toBe(false);
    } finally {
      rmSync(noGitDir, { recursive: true, force: true });
    }
  });

  it('returns false for non-existent path', () => {
    expect(isGitRepo('/nonexistent/path-xyz-123')).toBe(false);
  });
});

describe('checkAndInvalidateDrift', () => {
  it('archives derivatives when plan.md fingerprint changes', async () => {
    await createPlan(tmpDir, 'drift-test');
    await derivePlan(tmpDir, 'drift-test');
    await validatePlan(tmpDir, 'drift-test');
    await reviewPlan(tmpDir, 'drift-test');

    const planPath = join(getPlanDir(tmpDir, 'drift-test'), 'plan.md');
    writeFileSync(planPath, `${readFileSync(planPath, 'utf-8')}\n# Modified`, 'utf-8');

    await derivePlan(tmpDir, 'drift-test');

    const historyBaseDir = join(getPlanDir(tmpDir, 'drift-test'), 'history');
    expect(existsSync(historyBaseDir)).toBe(true);
  });

  it('resets state to DRAFT then DERIVED when drift detected', async () => {
    await createPlan(tmpDir, 'drift-state-test');
    await derivePlan(tmpDir, 'drift-state-test');
    await validatePlan(tmpDir, 'drift-state-test');
    await reviewPlan(tmpDir, 'drift-state-test');

    const planPath = join(getPlanDir(tmpDir, 'drift-state-test'), 'plan.md');
    writeFileSync(planPath, `${readFileSync(planPath, 'utf-8')}\n# Changed`, 'utf-8');

    await derivePlan(tmpDir, 'drift-state-test');

    const state = readState(getPlanDir(tmpDir, 'drift-state-test'));
    expect(state.state).toBe('DERIVED');
  });

  it('does nothing when fingerprint matches', async () => {
    await createPlan(tmpDir, 'no-drift-test');
    await derivePlan(tmpDir, 'no-drift-test');
    await derivePlan(tmpDir, 'no-drift-test');

    const historyBaseDir = join(getPlanDir(tmpDir, 'no-drift-test'), 'history');
    expect(existsSync(historyBaseDir)).toBe(false);
  });

  it('does nothing when plan.yaml does not exist yet', async () => {
    await createPlan(tmpDir, 'first-derive-test');
    await derivePlan(tmpDir, 'first-derive-test');

    const historyBaseDir = join(getPlanDir(tmpDir, 'first-derive-test'), 'history');
    expect(existsSync(historyBaseDir)).toBe(false);
  });
});

describe('extended YAML fields', () => {
  it('derives plan.yaml without optional fields when not populated', async () => {
    await createPlan(tmpDir, 'minimal-plan');
    const yamlPath = await derivePlan(tmpDir, 'minimal-plan');
    const yamlContent = parse(readFileSync(yamlPath, 'utf-8'));

    expect(yamlContent.plan_id).toBe('minimal-plan');
    expect(yamlContent.tags).toBeUndefined();
    expect(yamlContent.assignee).toBeUndefined();
    expect(yamlContent.dependencies).toBeUndefined();
    expect(yamlContent.estimated_effort).toBeUndefined();
  });

  it('extracts tags from plan.md when present', async () => {
    await createPlan(tmpDir, 'tags-plan');
    const planPath = join(getPlanDir(tmpDir, 'tags-plan'), 'plan.md');
    const content = readFileSync(planPath, 'utf-8');
    const withTags = content.replace(
      '## Tags\n\n<!-- Optional: comma-separated tags for filtering, e.g. backend, refactoring, urgent -->',
      '## Tags\n\nbackend, refactoring, urgent'
    );
    writeFileSync(planPath, withTags, 'utf-8');

    const yamlPath = await derivePlan(tmpDir, 'tags-plan');
    const yamlContent = parse(readFileSync(yamlPath, 'utf-8'));

    expect(yamlContent.tags).toEqual(['backend', 'refactoring', 'urgent']);
  });

  it('extracts assignee from plan.md when present', async () => {
    await createPlan(tmpDir, 'assignee-plan');
    const planPath = join(getPlanDir(tmpDir, 'assignee-plan'), 'plan.md');
    const content = readFileSync(planPath, 'utf-8');
    const withAssignee = content.replace(
      '## Assignee\n\n<!-- Optional: person or role responsible for this plan -->',
      '## Assignee\n\n@senior-dev'
    );
    writeFileSync(planPath, withAssignee, 'utf-8');

    const yamlPath = await derivePlan(tmpDir, 'assignee-plan');
    const yamlContent = parse(readFileSync(yamlPath, 'utf-8'));

    expect(yamlContent.assignee).toBe('@senior-dev');
  });

  it('extracts dependencies from plan.md when present', async () => {
    await createPlan(tmpDir, 'deps-plan');
    const planPath = join(getPlanDir(tmpDir, 'deps-plan'), 'plan.md');
    const content = readFileSync(planPath, 'utf-8');
    const withDeps = content.replace(
      '## Dependencies\n\n<!-- Optional: list of plan IDs this plan depends on, one per line -->',
      '## Dependencies\n\n- plan-001\n- plan-002'
    );
    writeFileSync(planPath, withDeps, 'utf-8');

    const yamlPath = await derivePlan(tmpDir, 'deps-plan');
    const yamlContent = parse(readFileSync(yamlPath, 'utf-8'));

    expect(yamlContent.dependencies).toEqual(['plan-001', 'plan-002']);
  });

  it('extracts estimated_effort from plan.md when present', async () => {
    await createPlan(tmpDir, 'effort-plan');
    const planPath = join(getPlanDir(tmpDir, 'effort-plan'), 'plan.md');
    const content = readFileSync(planPath, 'utf-8');
    const withEffort = content.replace(
      '## Estimated Effort\n\n<!-- Optional: human-readable estimate, e.g. 3d, 1w, 2sprints -->',
      '## Estimated Effort\n\n3d'
    );
    writeFileSync(planPath, withEffort, 'utf-8');

    const yamlPath = await derivePlan(tmpDir, 'effort-plan');
    const yamlContent = parse(readFileSync(yamlPath, 'utf-8'));

    expect(yamlContent.estimated_effort).toBe('3d');
  });

  it('validates plan.yaml with all optional fields populated', async () => {
    await createPlan(tmpDir, 'full-plan');
    const planPath = join(getPlanDir(tmpDir, 'full-plan'), 'plan.md');
    let content = readFileSync(planPath, 'utf-8');
    content = content.replace(
      '## Tags\n\n<!-- Optional: comma-separated tags for filtering, e.g. backend, refactoring, urgent -->',
      '## Tags\n\nbackend, urgent'
    );
    content = content.replace(
      '## Assignee\n\n<!-- Optional: person or role responsible for this plan -->',
      '## Assignee\n\n@tech-lead'
    );
    content = content.replace(
      '## Dependencies\n\n<!-- Optional: list of plan IDs this plan depends on, one per line -->',
      '## Dependencies\n\n- plan-arch-001'
    );
    content = content.replace(
      '## Estimated Effort\n\n<!-- Optional: human-readable estimate, e.g. 3d, 1w, 2sprints -->',
      '## Estimated Effort\n\n1w'
    );
    writeFileSync(planPath, content, 'utf-8');

    await derivePlan(tmpDir, 'full-plan');
    const reportPath = await validatePlan(tmpDir, 'full-plan');
    expect(existsSync(reportPath)).toBe(true);

    const yamlContent = parse(
      readFileSync(join(getPlanDir(tmpDir, 'full-plan'), 'plan.yaml'), 'utf-8')
    );
    expect(yamlContent.tags).toEqual(['backend', 'urgent']);
    expect(yamlContent.assignee).toBe('@tech-lead');
    expect(yamlContent.dependencies).toEqual(['plan-arch-001']);
    expect(yamlContent.estimated_effort).toBe('1w');
  });
});

describe('config boundaries', () => {
  // Config tests use a tmp home to avoid polluting real ~/.plan_dope/
  let origHome: string | undefined;
  let tmpHome: string;

  beforeEach(() => {
    origHome = process.env.HOME;
    tmpHome = join('/tmp', `plan-dope-home-${randomBytes(4).toString('hex')}`);
    mkdirSync(tmpHome, { recursive: true });
    process.env.HOME = tmpHome;
  });

  afterEach(() => {
    if (origHome !== undefined) {
      process.env.HOME = origHome;
    }
    rmSync(tmpHome, { recursive: true, force: true });
  });

  it('returns defaults when no global config exists', () => {
    const config = readGlobalConfig();
    expect(config.artifacts_base_path).toBe('_ctx');
    expect(config.auto_derive).toBe(false);
  });

  it('writes and reads global config', () => {
    const path = writeGlobalConfig({ artifacts_base_path: '_custom_ctx', auto_derive: true });
    expect(existsSync(path)).toBe(true);

    const config = readGlobalConfig();
    expect(config.artifacts_base_path).toBe('_custom_ctx');
    expect(config.auto_derive).toBe(true);
  });

  it('returns empty override when no project config exists', () => {
    const override = readProjectOverride(tmpDir);
    expect(override).toEqual({});
  });

  it('reads only allowed keys from project override', () => {
    const projectConfigPath = join(tmpDir, '.plan_dope.yml');
    writeFileSync(
      projectConfigPath,
      'artifacts_base_path: _project_ctx\nunknown_key: should_be_ignored\n',
      'utf-8'
    );

    const override = readProjectOverride(tmpDir);
    expect(override).toEqual({ artifacts_base_path: '_project_ctx' });
    expect('unknown_key' in override).toBe(false);
  });

  it('resolves config with correct precedence: defaults < global < project', () => {
    writeGlobalConfig({ artifacts_base_path: '_global_ctx', auto_derive: true });

    const projectConfigPath = join(tmpDir, '.plan_dope.yml');
    writeFileSync(projectConfigPath, 'artifacts_base_path: _project_ctx\n', 'utf-8');

    const config = resolveConfig(tmpDir);
    expect(config.artifacts_base_path).toBe('_project_ctx');
    expect(config.auto_derive).toBe(true);
  });

  it('resolves artifacts base path with project override taking precedence', () => {
    writeGlobalConfig({ artifacts_base_path: '_global_ctx' });
    const projectConfigPath = join(tmpDir, '.plan_dope.yml');
    writeFileSync(projectConfigPath, 'artifacts_base_path: _override_ctx\n', 'utf-8');

    const basePath = resolveArtifactsBasePath(tmpDir);
    expect(basePath).toBe('_override_ctx');
  });

  it('falls back to global config when no project override exists', () => {
    writeGlobalConfig({ artifacts_base_path: '_global_ctx' });

    const basePath = resolveArtifactsBasePath(tmpDir);
    expect(basePath).toBe('_global_ctx');
  });

  it('falls back to default when no config exists at all', () => {
    const basePath = resolveArtifactsBasePath(tmpDir);
    expect(basePath).toBe('_ctx');
  });
});

describe('drift outcomes', () => {
  it('returns no-existing-yaml when plan.yaml does not exist', () => {
    const planDir = join(tmpDir, '_ctx', 'plans', 'no-yaml-test');
    mkdirSync(planDir, { recursive: true });
    const outcome = checkAndInvalidateDrift(planDir, 'abc123');
    expect(outcome.type).toBe('no-existing-yaml');
  });

  it('returns no-drift when fingerprint matches', async () => {
    await createPlan(tmpDir, 'match-test');
    await derivePlan(tmpDir, 'match-test');
    const planDir = getPlanDir(tmpDir, 'match-test');
    const planPath = join(planDir, 'plan.md');
    const content = readFileSync(planPath, 'utf-8');
    const fp = fingerprint(content);
    const outcome = checkAndInvalidateDrift(planDir, fp);
    expect(outcome.type).toBe('no-drift');
  });

  it('returns drift-detected when fingerprint differs', async () => {
    await createPlan(tmpDir, 'drift-outcome-test');
    await derivePlan(tmpDir, 'drift-outcome-test');
    const planDir = getPlanDir(tmpDir, 'drift-outcome-test');
    const outcome = checkAndInvalidateDrift(planDir, 'different-fingerprint-xyz');
    expect(outcome.type).toBe('drift-detected');
    expect((outcome as Extract<DriftOutcome, { type: 'drift-detected' }>).archivedTo).toBeDefined();
    expect(
      existsSync((outcome as Extract<DriftOutcome, { type: 'drift-detected' }>).archivedTo)
    ).toBe(true);
  });

  it('returns yaml-corrupt when plan.yaml is not readable', () => {
    const planDir = join(tmpDir, '_ctx', 'plans', 'corrupt-yaml-test');
    mkdirSync(planDir, { recursive: true });
    writeFileSync(
      join(planDir, 'plan.yaml'),
      Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]),
      'binary'
    );
    const outcome = checkAndInvalidateDrift(planDir, 'abc123');
    expect(outcome.type).toBe('yaml-corrupt');
    expect((outcome as Extract<DriftOutcome, { type: 'yaml-corrupt' }>).error).toBeDefined();
  });

  it('derivePlan throws on corrupt plan.yaml', async () => {
    await createPlan(tmpDir, 'corrupt-derive-test');
    await derivePlan(tmpDir, 'corrupt-derive-test');
    const planDir = getPlanDir(tmpDir, 'corrupt-derive-test');
    writeFileSync(
      join(planDir, 'plan.yaml'),
      Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]),
      'binary'
    );
    await expect(derivePlan(tmpDir, 'corrupt-derive-test')).rejects.toThrow(
      'plan.yaml is corrupt and cannot be read'
    );
  });

  it('derivePlan succeeds after drift detection', async () => {
    await createPlan(tmpDir, 'drift-succeed-test');
    await derivePlan(tmpDir, 'drift-succeed-test');
    const planDir = getPlanDir(tmpDir, 'drift-succeed-test');
    const planPath = join(planDir, 'plan.md');
    writeFileSync(planPath, `${readFileSync(planPath, 'utf-8')}\n# Modified after derive`, 'utf-8');
    const yamlPath = await derivePlan(tmpDir, 'drift-succeed-test');
    expect(existsSync(yamlPath)).toBe(true);
    const historyBaseDir = join(planDir, 'history');
    expect(existsSync(historyBaseDir)).toBe(true);
  });
});

describe('state transitions', () => {
  it('allows DRAFT → DERIVED', () => {
    expect(() => validateStateTransition('DRAFT', 'DERIVED')).not.toThrow();
  });

  it('allows DERIVED → VALIDATED', () => {
    expect(() => validateStateTransition('DERIVED', 'VALIDATED')).not.toThrow();
  });

  it('allows VALIDATED → REVIEWED', () => {
    expect(() => validateStateTransition('VALIDATED', 'REVIEWED')).not.toThrow();
  });

  it('allows REVIEWED → HANDOFF_READY', () => {
    expect(() => validateStateTransition('REVIEWED', 'HANDOFF_READY')).not.toThrow();
  });

  it('allows REVIEWED → DRAFT (rollback)', () => {
    expect(() => validateStateTransition('REVIEWED', 'DRAFT')).not.toThrow();
  });

  it('rejects DRAFT → REVIEWED', () => {
    expect(() => validateStateTransition('DRAFT', 'REVIEWED')).toThrow('Invalid state transition');
  });

  it('rejects DRAFT → HANDOFF_READY', () => {
    expect(() => validateStateTransition('DRAFT', 'HANDOFF_READY')).toThrow(
      'Invalid state transition'
    );
  });

  it('rejects VALIDATED → HANDOFF_READY', () => {
    expect(() => validateStateTransition('VALIDATED', 'HANDOFF_READY')).toThrow(
      'Invalid state transition'
    );
  });

  it('readState throws on corrupt JSON', () => {
    const planDir = join(tmpDir, '_ctx', 'plans', 'corrupt-test');
    mkdirSync(planDir, { recursive: true });
    writeFileSync(join(planDir, '.state.json'), 'not valid json{{{', 'utf-8');
    expect(() => readState(planDir)).toThrow('Corrupt state file');
  });

  it('readState returns default when file missing', () => {
    const planDir = join(tmpDir, '_ctx', 'plans', 'missing-test');
    mkdirSync(planDir, { recursive: true });
    const state = readState(planDir);
    expect(state.state).toBe('DRAFT');
    expect(state.plan_id).toBe('unknown');
  });
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

  it('defaults fingerprint and verdict when review-report.md has partial fields', async () => {
    const id = 'close-legacy-partial';
    await createPlan(tmpDir, id);
    await derivePlan(tmpDir, id);
    await validatePlan(tmpDir, id);
    await reviewPlan(tmpDir, id);

    const planDir = getPlanDir(tmpDir, id);

    // Overwrite review-report.md with partial table (only Run ID, no Verdict/Fingerprint)
    const partialReport = [
      '# Review Report: close-legacy-partial',
      '',
      '## Summary',
      '',
      '| Field | Value |',
      '|-------|-------|',
      '| Run ID | review-partial-001 |',
      '',
    ].join('\n');
    writeFileSync(join(planDir, 'review-report.md'), partialReport, 'utf-8');

    // No summary.json exists for this fabricated run-id, so fallback triggers
    const cycleDir = await closePlanCycle(tmpDir, id);
    const meta = JSON.parse(readFileSync(join(cycleDir, 'meta.json'), 'utf-8'));

    expect(meta.review_run_id).toBe('review-partial-001');
    expect(meta.plan_md_fingerprint).toBe('unknown');
    expect(meta.final_verdict).toBe('PASS');
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
});
