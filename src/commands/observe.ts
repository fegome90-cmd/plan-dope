import { type ObserveOptions, observePlan } from '../core/observe.js';
import { resolveProjectRoot } from '../core/resolver.js';
import type { CommandOptions } from '../types/index.js';
import { badge } from '../ui/index.js';

export function observeCommand(opts: CommandOptions & ObserveOptions & { planId?: string }): void {
  let projectRoot: string;
  try {
    projectRoot = resolveProjectRoot(opts.project);
  } catch (error) {
    process.stderr.write(
      `${badge('fail', error instanceof Error ? error.message : String(error))}\n`
    );
    process.exit(1);
  }

  if (opts.finding && !opts.correct) {
    process.stderr.write(`${badge('fail', '--finding solo puede usarse junto a --correct')}\n`);
    process.exit(1);
  }

  if (!opts.comment && !opts.correct) {
    process.stderr.write(`${badge('fail', 'Debes especificar al menos --comment o --correct')}\n`);
    process.exit(1);
  }

  const observeOpts: ObserveOptions = {
    comment: opts.comment,
    correct: opts.correct,
    finding: opts.finding,
  };

  observePlan(projectRoot, observeOpts, opts.planId).then(
    (files) => {
      for (const f of files) {
        process.stdout.write(`${f}\n`);
      }
      process.stderr.write(`${badge('pass', 'Registro de observacion completado')}\n`);
    },
    (error) => {
      process.stderr.write(
        `${badge('fail', error instanceof Error ? error.message : String(error))}\n`
      );
      process.exit(1);
    }
  );
}
