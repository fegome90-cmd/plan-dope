import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const CLI = '/Users/felipe_gonzalez/Developer/plan_dope/src/index.ts';

let tmpDir: string;
let counter = 0;

function makeTmpDir(): string {
  counter++;
  return join('/tmp', `plan-dope-cli-test-${counter}`);
}

function runCli(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const cwd = args.pop()!;
  const result = spawnSync('npx', ['tsx', CLI, ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

beforeEach(() => {
  tmpDir = makeTmpDir();
  mkdirSync(tmpDir, { recursive: true });
  spawnSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
});

afterEach(() => {
  if (existsSync(tmpDir)) {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // cleanup
    }
  }
});

describe('observe command', () => {
  it('rejects invalid finding_ref format', async () => {
    runCli('create', '--id', 'cli-observe-test', tmpDir);
    runCli('derive', '--plan-id', 'cli-observe-test', tmpDir);
    runCli('validate', '--plan-id', 'cli-observe-test', tmpDir);
    runCli('review', '--plan-id', 'cli-observe-test', tmpDir);

    const result = runCli(
      'observe',
      'cli-observe-test',
      '--correct',
      'test fix',
      '--finding',
      'invalid-format',
      tmpDir
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Invalid finding_ref format');
  });

  it('accepts valid finding_ref format', async () => {
    runCli('create', '--id', 'cli-observe-valid', tmpDir);
    runCli('derive', '--plan-id', 'cli-observe-valid', tmpDir);
    runCli('validate', '--plan-id', 'cli-observe-valid', tmpDir);
    runCli('review', '--plan-id', 'cli-observe-valid', tmpDir);

    const result = runCli(
      'observe',
      'cli-observe-valid',
      '--correct',
      'valid fix',
      '--finding',
      'review-abc123-def4:F-01',
      tmpDir
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Registro de observacion completado');
  });

  it('requires --comment or --correct', async () => {
    runCli('create', '--id', 'cli-observe-noflags', tmpDir);

    const result = runCli('observe', 'cli-observe-noflags', tmpDir);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Debes especificar al menos --comment o --correct');
  });

  it('rejects --finding without --correct', async () => {
    runCli('create', '--id', 'cli-observe-finding-only', tmpDir);

    const result = runCli(
      'observe',
      'cli-observe-finding-only',
      '--finding',
      'review-abc123-def4:F-01',
      tmpDir
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('--finding solo puede usarse junto a --correct');
  });
});

describe('close command', () => {
  it('rejects close when plan is not REVIEWED', async () => {
    runCli('create', '--id', 'cli-close-draft', tmpDir);

    const result = runCli('close', 'cli-close-draft', tmpDir);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot close plan in state 'DRAFT'");
  });

  it('closes plan successfully after full pipeline', async () => {
    runCli('create', '--id', 'cli-close-full', tmpDir);
    runCli('derive', '--plan-id', 'cli-close-full', tmpDir);
    runCli('validate', '--plan-id', 'cli-close-full', tmpDir);
    runCli('review', '--plan-id', 'cli-close-full', tmpDir);

    const result = runCli('close', 'cli-close-full', tmpDir);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Snapshot guardado en');
    expect(result.stdout).toContain('history/cycle-1');

    const reviewRunsDir = join(tmpDir, '_ctx', 'review_runs');
    const runDirs = readdirSyncSafe(reviewRunsDir);
    expect(runDirs.length).toBeGreaterThan(0);

    const runDir = join(reviewRunsDir, runDirs[0]);
    expect(existsSync(join(runDir, 'summary.json'))).toBe(true);

    const summary = JSON.parse(readFileSync(join(runDir, 'summary.json'), 'utf-8'));
    expect(summary.run_id).toBeDefined();
    expect(summary.plan_id).toBe('cli-close-full');
    expect(summary.plan_md_fingerprint).toBeDefined();
    expect(summary.verdict).toBeDefined();
    expect(summary.reviewed_at).toBeDefined();
  });

  it('close reads summary.json for structured data', async () => {
    runCli('create', '--id', 'cli-close-structured', tmpDir);
    runCli('derive', '--plan-id', 'cli-close-structured', tmpDir);
    runCli('validate', '--plan-id', 'cli-close-structured', tmpDir);
    runCli('review', '--plan-id', 'cli-close-structured', tmpDir);

    const reviewRunsDir = join(tmpDir, '_ctx', 'review_runs');
    const runDirs = readdirSyncSafe(reviewRunsDir);
    const runDir = join(reviewRunsDir, runDirs[0]);
    expect(existsSync(join(runDir, 'summary.json'))).toBe(true);

    runCli('close', 'cli-close-structured', tmpDir);

    const historyDir = join(tmpDir, '_ctx', 'plans', 'cli-close-structured', 'history', 'cycle-1');
    const meta = JSON.parse(readFileSync(join(historyDir, 'meta.json'), 'utf-8'));
    expect(meta.plan_md_fingerprint).not.toBe('unknown');
    expect(meta.final_verdict).not.toBe('PASS');
    expect(meta.review_run_id).not.toBe('unknown');
  });
});

function readdirSyncSafe(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir);
}
