import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PlanState } from '../types/index.js';
import { getPlanDir } from './resolver.js';

const PLAN_TEMPLATE = (id: string) => `# Plan: ${id}

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
`;

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `plan-${timestamp}-${random}`;
}

export function now(): string {
  return new Date().toISOString();
}

export async function createPlan(projectRoot: string, planId?: string): Promise<string> {
  const id = planId || generateId();
  const planDir = getPlanDir(projectRoot, id);

  if (!existsSync(planDir)) {
    mkdirSync(planDir, { recursive: true });
  }

  const planPath = join(planDir, 'plan.md');

  if (existsSync(planPath)) {
    throw new Error(`Plan '${id}' already exists at ${planPath}`);
  }

  writeFileSync(planPath, PLAN_TEMPLATE(id), 'utf-8');

  // Write initial state metadata
  const statePath = join(planDir, '.state.json');
  writeFileSync(statePath, JSON.stringify({
    plan_id: id,
    state: 'DRAFT' as PlanState,
    created_at: now(),
    updated_at: now(),
  }, null, 2), 'utf-8');

  return planPath;
}
