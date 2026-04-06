import { resolveProjectRoot } from '../core/resolver.js';
import { reviewPlan } from '../core/review.js';
import type { CommandOptions } from '../types/index.js';
import { badge } from '../ui/index.js';

export function reviewCommand(opts: CommandOptions & { planId?: string }): void {
  let projectRoot: string;
  try {
    projectRoot = resolveProjectRoot(opts.project);
  } catch (error) {
    process.stderr.write(
      `${badge('fail', error instanceof Error ? error.message : String(error))}\n`
    );
    process.exit(1);
    return;
  }
  reviewPlan(projectRoot, opts.planId).then(
    (reportPath) => {
      process.stdout.write(`${reportPath}\n`);
      process.stderr.write(`${badge('pass', reportPath)}\n`);
    },
    (error) => {
      process.stderr.write(
        `${badge('fail', error instanceof Error ? error.message : String(error))}\n`
      );
      process.exit(1);
    }
  );
}
