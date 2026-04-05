import type { Command } from 'commander';
import { resolveProjectRoot } from '../core/resolver.js';
import { reviewPlan } from '../core/review.js';
import type { CommandOptions } from '../types/index.js';

export function reviewCommand(_program: Command, opts: CommandOptions & { planId?: string }): void {
  let projectRoot: string;
  try {
    projectRoot = resolveProjectRoot(opts.project);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
    return;
  }
  reviewPlan(projectRoot, opts.planId).then(
    (reportPath) => {
      process.stdout.write(`${reportPath}\n`);
      process.stderr.write(`Reporte de review: ${reportPath}\n`);
    },
    (error) => {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  );
}
