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
