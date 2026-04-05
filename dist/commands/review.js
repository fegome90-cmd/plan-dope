import { resolveProjectRoot } from '../core/resolver.js';
import { reviewPlan } from '../core/review.js';
export function reviewCommand(_program, opts) {
    const projectRoot = resolveProjectRoot(opts.project);
    reviewPlan(projectRoot, opts.planId).then((reportPath) => {
        process.stdout.write(`${reportPath}\n`);
        process.stderr.write(`Reporte de review: ${reportPath}\n`);
    }, (error) => {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    });
}
//# sourceMappingURL=review.js.map