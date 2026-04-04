import { createCommand } from './commands/create.js';
import { deriveCommand } from './commands/derive.js';
import { validateCommand } from './commands/validate.js';
import { reviewCommand } from './commands/review.js';
import { checkpointCommand } from './commands/checkpoint.js';
import { wizardCommand } from './commands/wizard.js';
export function registerCommands(program) {
    createCommand(program);
    deriveCommand(program);
    validateCommand(program);
    reviewCommand(program);
    checkpointCommand(program);
    wizardCommand(program);
}
//# sourceMappingURL=cli.js.map