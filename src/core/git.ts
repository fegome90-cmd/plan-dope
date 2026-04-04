import { execSync } from 'child_process';
import { statSync } from 'fs';

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
    })
      .toString()
      .trim();
    return result === 'true';
  } catch {
    return false;
  }
}
