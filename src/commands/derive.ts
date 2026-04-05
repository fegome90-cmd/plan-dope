import type { Command } from 'commander';
import { derivePlan } from '../core/derive.js';
import { resolveProjectRoot } from '../core/resolver.js';
import type { CommandOptions } from '../types/index.js';

export function deriveCommand(_program: Command, opts: CommandOptions & { planId?: string }): void {
  let projectRoot: string;
  try {
    projectRoot = resolveProjectRoot(opts.project);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
    return;
  }
  derivePlan(projectRoot, opts.planId).then(
    (yamlPath) => {
      process.stdout.write(`${yamlPath}\n`);
      process.stderr.write(`Plan derivado: ${yamlPath}\n`);
    },
    (error) => {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  );
}
