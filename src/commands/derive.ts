import type { Command } from 'commander';
import { derivePlan } from '../core/derive.js';
import { resolveProjectRoot } from '../core/resolver.js';
import type { CommandOptions } from '../types/index.js';

export function deriveCommand(_program: Command, opts: CommandOptions & { planId?: string }): void {
  const projectRoot = resolveProjectRoot(opts.project);
  derivePlan(projectRoot, opts.planId).then(
    (yamlPath) => {
      process.stdout.write(`Plan derivado: ${yamlPath}\n`);
    },
    (error) => {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  );
}
