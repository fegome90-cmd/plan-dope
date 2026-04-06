import { resolveProjectRoot } from '../core/resolver.js';
import { validatePlan } from '../core/validate.js';
import type { CommandOptions } from '../types/index.js';

export function validateCommand(opts: CommandOptions & { planId?: string }): void {
  let projectRoot: string;
  try {
    projectRoot = resolveProjectRoot(opts.project);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
    return;
  }
  validatePlan(projectRoot, opts.planId).then(
    (reportPath) => {
      process.stdout.write(`${reportPath}\n`);
      process.stderr.write(`Reporte de validación: ${reportPath}\n`);
    },
    (error) => {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  );
}
