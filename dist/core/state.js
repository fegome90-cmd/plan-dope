import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { now } from './create.js';
export function readState(planDir) {
    const statePath = join(planDir, '.state.json');
    if (!existsSync(statePath)) {
        return {
            plan_id: 'unknown',
            state: 'DRAFT',
            created_at: now(),
            updated_at: now(),
        };
    }
    return JSON.parse(readFileSync(statePath, 'utf-8'));
}
export function updateState(planDir, newState) {
    const state = readState(planDir);
    state.state = newState;
    state.updated_at = now();
    writeFileSync(join(planDir, '.state.json'), JSON.stringify(state, null, 2), 'utf-8');
}
//# sourceMappingURL=state.js.map