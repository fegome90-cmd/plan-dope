import { createCheckpoint } from '../core/checkpoint.js';
import { resolveProjectRoot } from '../core/resolver.js';
import type { CommandOptions, HandoffReason } from '../types/index.js';
import { badge } from '../ui/index.js';

export function checkpointCommand(
  opts: CommandOptions & { planId?: string; reason: HandoffReason }
): void {
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
  createCheckpoint(projectRoot, opts.planId, opts.reason).then(
    (checkpointPath) => {
      process.stdout.write(`${checkpointPath}\n`);
      process.stderr.write(`${badge('checkpoint', checkpointPath)}\n`);
    },
    (error) => {
      process.stderr.write(
        `${badge('fail', error instanceof Error ? error.message : String(error))}\n`
      );
      process.exit(1);
    }
  );
}
