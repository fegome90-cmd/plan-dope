import { derivePlan } from '../core/derive.js';
import { resolveProjectRoot } from '../core/resolver.js';
export function deriveCommand(_program, opts) {
    const projectRoot = resolveProjectRoot(opts.project);
    derivePlan(projectRoot, opts.planId).then((yamlPath) => {
        process.stdout.write(`${yamlPath}\n`);
        process.stderr.write(`Plan derivado: ${yamlPath}\n`);
    }, (error) => {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    });
}
//# sourceMappingURL=derive.js.map