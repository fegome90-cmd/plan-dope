import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PlanState } from '../types/index.js';
import { now } from './create.js';

interface StateFile {
  plan_id: string;
  state: PlanState;
  created_at: string;
  updated_at: string;
}

const VALID_TRANSITIONS: Record<PlanState, PlanState[]> = {
  DRAFT: ['DERIVED'],
  DERIVED: ['VALIDATED', 'DRAFT'],
  VALIDATED: ['REVIEWED', 'DRAFT', 'DERIVED'],
  REVIEWED: ['HANDOFF_READY', 'DRAFT'],
  HANDOFF_READY: ['DRAFT'],
};

export function validateStateTransition(from: PlanState, to: PlanState): void {
  if (from === to) return;
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid state transition: ${from} → ${to}. Allowed: ${allowed.join(', ')}`);
  }
}

export function readState(planDir: string): StateFile {
  const statePath = join(planDir, '.state.json');
  if (!existsSync(statePath)) {
    return {
      plan_id: 'unknown',
      state: 'DRAFT',
      created_at: now(),
      updated_at: now(),
    };
  }
  try {
    return JSON.parse(readFileSync(statePath, 'utf-8'));
  } catch (e) {
    throw new Error(`Corrupt state file at ${statePath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function updateState(planDir: string, newState: PlanState): void {
  const state = readState(planDir);
  validateStateTransition(state.state, newState);
  state.state = newState;
  state.updated_at = now();
  writeFileSync(join(planDir, '.state.json'), JSON.stringify(state, null, 2), 'utf-8');
}
