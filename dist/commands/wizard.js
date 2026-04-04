import { createPlan } from '../core/create.js';
import { derivePlan } from '../core/derive.js';
import { validatePlan } from '../core/validate.js';
import { reviewPlan } from '../core/review.js';
import { createCheckpoint } from '../core/checkpoint.js';
import { resolveProjectRoot } from '../core/resolver.js';
import * as readline from 'readline';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}
export function wizardCommand(program) {
    program
        .command('wizard')
        .description('Orquestar interactivamente create → derive → validate → review → checkpoint')
        .option('-p, --project <path>', 'Path del proyecto target')
        .action(async (opts) => {
        try {
            const projectRoot = resolveProjectRoot(opts.project);
            console.log('═══════════════════════════════════════════');
            console.log('  plan_dope wizard — pipeline interactivo');
            console.log('═══════════════════════════════════════════\n');
            // Step 1: Create
            console.log('[1/5] Creando plan.md...');
            const planId = await ask('ID del plan (Enter para auto-generar): ');
            const planPath = await createPlan(projectRoot, planId || undefined);
            console.log(`  ✓ Plan creado: ${planPath}\n`);
            // Step 2: Derive
            console.log('[2/5] Derivando plan.yaml...');
            const yamlPath = await derivePlan(projectRoot, planId || undefined);
            console.log(`  ✓ Plan derivado: ${yamlPath}\n`);
            // Step 3: Validate
            console.log('[3/5] Validando plan.yaml...');
            const reportPath = await validatePlan(projectRoot, planId || undefined);
            console.log(`  ✓ Validación completada: ${reportPath}\n`);
            // Step 4: Review
            console.log('[4/5] Ejecutando review...');
            const reviewPath = await reviewPlan(projectRoot, planId || undefined);
            console.log(`  ✓ Review completado: ${reviewPath}\n`);
            // Step 5: Checkpoint
            console.log('[5/5] Creando checkpoint de handoff...');
            const reasonInput = await ask('Razón de handoff (pause/transfer/completion) [transfer]: ');
            const reason = reasonInput.trim() || 'transfer';
            const checkpointPath = await createCheckpoint(projectRoot, planId || undefined, reason);
            console.log(`  ✓ Checkpoint creado: ${checkpointPath}\n`);
            console.log('═══════════════════════════════════════════');
            console.log('  Pipeline completado exitosamente');
            console.log('═══════════════════════════════════════════');
            rl.close();
        }
        catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            rl.close();
            process.exit(1);
        }
    });
}
//# sourceMappingURL=wizard.js.map