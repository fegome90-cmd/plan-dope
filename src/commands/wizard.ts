import * as readline from 'node:readline';
import type { Command } from 'commander';
import { createCheckpoint } from '../core/checkpoint.js';
import { createPlan } from '../core/create.js';
import { derivePlan } from '../core/derive.js';
import { resolveProjectRoot } from '../core/resolver.js';
import { reviewPlan } from '../core/review.js';
import { validatePlan } from '../core/validate.js';
import type { CommandOptions, HandoffReason } from '../types/index.js';

const log = (msg: string) => process.stderr.write(`${msg}\n`);
const out = (msg: string) => process.stdout.write(`${msg}\n`);

export function wizardCommand(_program: Command, opts: CommandOptions): void {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  const onSigint = () => {
    log('\nWizard cancelled.');
    rl.close();
    process.exit(0);
  };
  process.on('SIGINT', onSigint);

  (async () => {
    const projectRoot = resolveProjectRoot(opts.project);

    log('═══════════════════════════════════════════');
    log('  plan_dope wizard — pipeline interactivo');
    log('═══════════════════════════════════════════\n');

    log('[1/5] Creando plan.md...');
    const planId = await ask('ID del plan (Enter para auto-generar): ');
    const planPath = await createPlan(projectRoot, planId || undefined);
    out(planPath);
    log('');

    log('[2/5] Derivando plan.yaml...');
    const yamlPath = await derivePlan(projectRoot, planId || undefined);
    out(yamlPath);
    log('');

    log('[3/5] Validando plan.yaml...');
    const reportPath = await validatePlan(projectRoot, planId || undefined);
    out(reportPath);
    log('');

    log('[4/5] Ejecutando review...');
    const reviewPath = await reviewPlan(projectRoot, planId || undefined);
    out(reviewPath);
    log('');

    log('[5/5] Creando checkpoint de handoff...');
    const reasonInput = (
      await ask('Razón de handoff (pause/transfer/completion) [transfer]: ')
    ).trim();
    const validReasons: HandoffReason[] = ['pause', 'transfer', 'completion'];
    const reason = validReasons.includes(reasonInput as HandoffReason)
      ? (reasonInput as HandoffReason)
      : 'transfer';
    const checkpointPath = await createCheckpoint(projectRoot, planId || undefined, reason);
    out(checkpointPath);
    log('');

    log('═══════════════════════════════════════════');
    log('  Pipeline completado exitosamente');
    log('═══════════════════════════════════════════');

    process.off('SIGINT', onSigint);
    rl.close();
  })().catch((error: unknown) => {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.off('SIGINT', onSigint);
    rl.close();
    process.exit(1);
  });
}
