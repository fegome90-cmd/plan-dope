import { closePlanCycle } from '../core/close.js';
import { resolveProjectRoot } from '../core/resolver.js';
import type { CommandOptions } from '../types/index.js';
import { badge } from '../ui/index.js';

export function closeCommand(opts: CommandOptions & { planId?: string }): void {
  let projectRoot: string;
  try {
    projectRoot = resolveProjectRoot(opts.project);
  } catch (error) {
    process.stderr.write(
      `${badge('fail', error instanceof Error ? error.message : String(error))}\n`
    );
    process.exit(1);
  }

  closePlanCycle(projectRoot, opts.planId).then(
    (cycleDir) => {
      process.stdout.write(`${cycleDir}\n`);
      process.stderr.write(`${badge('pass', `Snapshot guardado en: ${cycleDir}`)}\n`);
    },
    (error) => {
      process.stderr.write(
        `${badge('fail', error instanceof Error ? error.message : String(error))}\n`
      );
      process.exit(1);
    }
  );
}
