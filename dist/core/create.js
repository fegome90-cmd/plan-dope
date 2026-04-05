import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPlanDir } from './resolver.js';
const PLAN_TEMPLATE = (id) => `# Plan: ${id}

## Purpose

<!-- Describe what this plan is about -->

## Scope

<!-- What's in and what's out -->

## Phases

### Phase 1: <!-- name -->

<!-- Description and tasks -->

## Risks

<!-- Known risks and mitigations -->

## Validation Criteria

<!-- How do we know this plan is complete and correct? -->

## Assumptions

<!-- What are we assuming to be true? -->

## Tags

<!-- Optional: comma-separated tags for filtering, e.g. backend, refactoring, urgent -->

## Assignee

<!-- Optional: person or role responsible for this plan -->

## Dependencies

<!-- Optional: list of plan IDs this plan depends on, one per line -->

## Estimated Effort

<!-- Optional: human-readable estimate, e.g. 3d, 1w, 2sprints -->
`;
export function generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `plan-${timestamp}-${random}`;
}
export function now() {
    return new Date().toISOString();
}
export async function createPlan(projectRoot, planId) {
    const id = planId || generateId();
    const planDir = getPlanDir(projectRoot, id);
    if (!existsSync(planDir)) {
        mkdirSync(planDir, { recursive: true });
    }
    const planPath = join(planDir, 'plan.md');
    if (existsSync(planPath)) {
        throw new Error(`Plan '${id}' already exists at ${planPath}`);
    }
    // Detect orphan directory: directory exists with artifacts but no plan.md
    const statePath = join(planDir, '.state.json');
    if (existsSync(statePath)) {
        throw new Error(`Orphan plan directory detected at ${planDir}. Remove it and retry, or use a different plan ID.`);
    }
    writeFileSync(planPath, PLAN_TEMPLATE(id), 'utf-8');
    // Write initial state metadata
    writeFileSync(statePath, JSON.stringify({
        plan_id: id,
        state: 'DRAFT',
        created_at: now(),
        updated_at: now(),
    }, null, 2), 'utf-8');
    return planPath;
}
//# sourceMappingURL=create.js.map