import { resolveProjectRoot } from '../core/resolver.js';
import { validatePlan } from '../core/validate.js';
export function validateCommand(_program, opts) {
    const projectRoot = resolveProjectRoot(opts.project);
    validatePlan(projectRoot, opts.planId).then((reportPath) => {
        process.stdout.write(`${reportPath}\n`);
        process.stderr.write(`Reporte de validación: ${reportPath}\n`);
    }, (error) => {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    });
}
//# sourceMappingURL=validate.js.map