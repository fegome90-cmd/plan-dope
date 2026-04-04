import { derivePlan } from '../core/derive.js';
import { resolveProjectRoot } from '../core/resolver.js';
export function deriveCommand(program) {
    program
        .command('derive')
        .description('Derivar plan.yaml desde plan.md')
        .option('-p, --project <path>', 'Path del proyecto target')
        .option('--plan-id <plan-id>', 'ID del plan a derivar')
        .action(async (opts) => {
        try {
            const projectRoot = resolveProjectRoot(opts.project);
            const yamlPath = await derivePlan(projectRoot, opts.planId);
            console.log(`Plan derivado: ${yamlPath}`);
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=derive.js.map