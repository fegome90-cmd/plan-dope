import { Command } from 'commander';
import { derivePlan } from '../core/derive.js';
import { resolveProjectRoot } from '../core/resolver.js';
import { CommandOptions } from '../types/index.js';

export function deriveCommand(program: Command): void {
  program
    .command('derive')
    .description('Derivar plan.yaml desde plan.md')
    .option('-p, --project <path>', 'Path del proyecto target')
    .option('--plan-id <plan-id>', 'ID del plan a derivar')
    .action(async (opts: CommandOptions & { planId?: string }) => {
      try {
        const projectRoot = resolveProjectRoot(opts.project);
        const yamlPath = await derivePlan(projectRoot, opts.planId);
        console.log(`Plan derivado: ${yamlPath}`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
