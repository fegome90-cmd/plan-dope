import { Command } from 'commander';
import { createCheckpoint } from '../core/checkpoint.js';
import { resolveProjectRoot } from '../core/resolver.js';
import { CommandOptions, HandoffReason } from '../types/index.js';

export function checkpointCommand(program: Command): void {
  program
    .command('checkpoint')
    .description('Delegar a checkpoint-card para producir handoff')
    .option('-p, --project <path>', 'Path del proyecto target')
    .option('--plan-id <plan-id>', 'ID del plan')
    .option('-r, --reason <reason>', 'Razón de handoff: pause, transfer, completion', 'transfer')
    .action(async (opts: CommandOptions & { planId?: string; reason: HandoffReason }) => {
      try {
        const projectRoot = resolveProjectRoot(opts.project);
        const checkpointPath = await createCheckpoint(projectRoot, opts.planId, opts.reason);
        console.log(`Checkpoint creado: ${checkpointPath}`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
