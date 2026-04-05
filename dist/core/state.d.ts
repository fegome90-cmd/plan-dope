import type { PlanState } from '../types/index.js';
interface StateFile {
    plan_id: string;
    state: PlanState;
    created_at: string;
    updated_at: string;
}
export declare function validateStateTransition(from: PlanState, to: PlanState): void;
export declare function readState(planDir: string): StateFile;
export declare function updateState(planDir: string, newState: PlanState): void;
export {};
//# sourceMappingURL=state.d.ts.map