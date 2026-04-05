import type { Command } from 'commander';
import type { CommandOptions, HandoffReason } from '../types/index.js';
export declare function checkpointCommand(_program: Command, opts: CommandOptions & {
    planId?: string;
    reason: HandoffReason;
}): void;
//# sourceMappingURL=checkpoint.d.ts.map