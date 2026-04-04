import { createPlan } from '../core/create.js';
import { resolveProjectRoot } from '../core/resolver.js';
export function createCommand(program) {
    program
        .command('create')
        .description('Iniciar authoring y crear esqueleto de plan.md')
        .option('-p, --project <path>', 'Path del proyecto target')
        .option('--id <plan-id>', 'ID del plan (auto-generado si no se pasa)')
        .action(async (opts) => {
        try {
            const projectRoot = resolveProjectRoot(opts.project);
            const planPath = await createPlan(projectRoot, opts.id);
            console.log(`Plan creado: ${planPath}`);
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=create.js.map