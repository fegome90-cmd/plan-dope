import type { Command } from 'commander';
import { createCheckpoint } from '../core/checkpoint.js';
import { resolveProjectRoot } from '../core/resolver.js';
import type { CommandOptions, HandoffReason } from '../types/index.js';

export function checkpointCommand(
  _program: Command,
  opts: CommandOptions & { planId?: string; reason: HandoffReason }
): void {
  const projectRoot = resolveProjectRoot(opts.project);
  createCheckpoint(projectRoot, opts.planId, opts.reason).then(
    (checkpointPath) => {
      process.stdout.write(`${checkpointPath}\n`);
      process.stderr.write(`Checkpoint creado: ${checkpointPath}\n`);
    },
    (error) => {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  );
}