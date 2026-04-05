import type { Command } from 'commander';
import { createPlan } from '../core/create.js';
import { resolveProjectRoot } from '../core/resolver.js';
import type { CommandOptions } from '../types/index.js';

export function createCommand(_program: Command, opts: CommandOptions & { id?: string }): void {
  const projectRoot = resolveProjectRoot(opts.project);
  createPlan(projectRoot, opts.id).then(
    (planPath) => {
      process.stdout.write(`${planPath}\n`);
      process.stderr.write(`Plan creado: ${planPath}\n`);
    },
    (error) => {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  );
}