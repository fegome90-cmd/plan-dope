import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';

export function isGitRepo(root: string): boolean {
  try {
    statSync(root);
  } catch {
    return false;
  }

  try {
    const result = execSync('git rev-parse --is-inside-work-tree', {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
      maxBuffer: 1024,
    })
      .toString()
      .trim();
    return result === 'true';
  } catch {
    return false;
  }
}

/**
 * Resolve the git repository toplevel for a given directory.
 * Returns null if not inside a git repo or if the command fails.
 */
export function gitToplevel(dir: string): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd: dir,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
      maxBuffer: 1024,
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}
