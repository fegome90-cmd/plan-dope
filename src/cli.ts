import type { Command } from 'commander';
import { checkpointCommand } from './commands/checkpoint.js';
import { createCommand } from './commands/create.js';
import { deriveCommand } from './commands/derive.js';
import { reviewCommand } from './commands/review.js';
import { validateCommand } from './commands/validate.js';
import { wizardCommand } from './commands/wizard.js';

export function registerCommands(program: Command): void {
  createCommand(program);
  deriveCommand(program);
  validateCommand(program);
  reviewCommand(program);
  checkpointCommand(program);
  wizardCommand(program);
}
