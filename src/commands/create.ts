import { createPlan } from '../core/create.js';
import { resolveProjectRoot } from '../core/resolver.js';
import type { CommandOptions } from '../types/index.js';
import { badge } from '../ui/index.js';

export function createCommand(opts: CommandOptions & { id?: string }): void {
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
  createPlan(projectRoot, opts.id).then(
    (planPath) => {
      process.stdout.write(`${planPath}\n`);
      process.stderr.write(`${badge('created', planPath)}\n`);
    },
    (error) => {
      process.stderr.write(
        `${badge('fail', error instanceof Error ? error.message : String(error))}\n`
      );
      process.exit(1);
    }
  );
}
