import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gitToplevel, isGitRepo } from './git.js';

export function resolveProjectRoot(projectPath?: string): string {
  if (projectPath) {
    const resolved = projectPath.startsWith('~')
      ? join(process.env.HOME || '', projectPath.slice(1))
      : projectPath;

    if (!existsSync(resolved)) {
      throw new Error(`Project path does not exist: ${resolved}`);
    }

    if (!isGitRepo(resolved)) {
      throw new Error(
        `Not a git repository: ${resolved}. Run plan_dope from within a git repo or use --project <path> to a valid repo.`
      );
    }

    const toplevel = gitToplevel(resolved);
    return toplevel ?? resolved;
  }

  // Use cwd
  const cwd = process.cwd();
  if (!existsSync(cwd)) {
    throw new Error('Current working directory does not exist');
  }

  if (!isGitRepo(cwd)) {
    throw new Error(
      `Not a git repository: ${cwd}. Run plan_dope from within a git repo or use --project <path> to a valid repo.`
    );
  }

  const toplevel = gitToplevel(cwd);
  return toplevel ?? cwd;
}

export function getPlanDir(projectRoot: string, planId: string, artifactsBase = '_ctx'): string {
  return join(projectRoot, artifactsBase, 'plans', planId);
}

export function getPlansDir(projectRoot: string, artifactsBase = '_ctx'): string {
  return join(projectRoot, artifactsBase, 'plans');
}

const NO_PLANS_FOUND = 'No plans found. Run `plan create` first.';

export function findPlanId(projectRoot: string, planId?: string, artifactsBase = '_ctx'): string {
  if (planId) {
    const dir = getPlanDir(projectRoot, planId, artifactsBase);
    if (!existsSync(join(dir, 'plan.md'))) {
      throw new Error(`Plan '${planId}' not found at ${dir}`);
    }
    return planId;
  }

  const plansDir = getPlansDir(projectRoot, artifactsBase);
  if (!existsSync(plansDir)) {
    throw new Error(NO_PLANS_FOUND);
  }

  const dirs = readdirSync(plansDir).filter((d) => existsSync(join(plansDir, d, 'plan.md')));

  if (dirs.length === 0) {
    throw new Error(NO_PLANS_FOUND);
  }

  const latest = dirs.sort().pop();
  if (!latest) {
    throw new Error(NO_PLANS_FOUND);
  }

  return latest;
}
