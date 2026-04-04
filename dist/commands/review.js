import { reviewPlan } from '../core/review.js';
import { resolveProjectRoot } from '../core/resolver.js';
export function reviewCommand(program) {
    program
        .command('review')
        .description('Revisar plan y producir review-report.md')
        .option('-p, --project <path>', 'Path del proyecto target')
        .option('--plan-id <plan-id>', 'ID del plan a revisar')
        .action(async (opts) => {
        try {
            const projectRoot = resolveProjectRoot(opts.project);
            const reportPath = await reviewPlan(projectRoot, opts.planId);
            console.log(`Reporte de review: ${reportPath}`);
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=review.js.map