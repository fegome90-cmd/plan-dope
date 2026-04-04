import { Command } from 'commander';
import { validatePlan } from '../core/validate.js';
import { resolveProjectRoot } from '../core/resolver.js';
import { CommandOptions } from '../types/index.js';

export function validateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validar plan.yaml y producir validation-report.yaml')
    .option('-p, --project <path>', 'Path del proyecto target')
    .option('--plan-id <plan-id>', 'ID del plan a validar')
    .action(async (opts: CommandOptions & { planId?: string }) => {
      try {
        const projectRoot = resolveProjectRoot(opts.project);
        const reportPath = await validatePlan(projectRoot, opts.planId);
        console.log(`Reporte de validación: ${reportPath}`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
