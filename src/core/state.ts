import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PlanState } from '../types/index.js';
import { now } from './utils.js';

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

const VALID_STATES: PlanState[] = ['DRAFT', 'DERIVED', 'VALIDATED', 'REVIEWED', 'HANDOFF_READY'];

function isValidPlanState(state: unknown): state is PlanState {
  return typeof state === 'string' && VALID_STATES.includes(state as PlanState);
}

export function validateStateTransition(from: PlanState, to: PlanState): void {
  if (from === to) return;
  if (!isValidPlanState(from) || !isValidPlanState(to)) {
    throw new Error(`Corrupt state file: invalid state values (from: ${from}, to: ${to})`);
  }
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) {
    throw new Error(`Corrupt state file: no valid transitions defined for state '${from}'`);
  }
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
    const parsed = JSON.parse(readFileSync(statePath, 'utf-8'));
    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure');
    }
    if (!isValidPlanState(parsed.state)) {
      throw new Error(`Invalid state value: ${parsed.state}`);
    }
    if (typeof parsed.plan_id !== 'string') {
      throw new Error('Missing or invalid plan_id');
    }
    return parsed as StateFile;
  } catch (e) {
    throw new Error(
      `Corrupt state file at ${statePath}: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export function updateState(planDir: string, newState: PlanState): void {
  const state = readState(planDir);
  validateStateTransition(state.state, newState);
  const updated: StateFile = { ...state, state: newState, updated_at: now() };
  writeFileSync(join(planDir, '.state.json'), JSON.stringify(updated, null, 2), 'utf-8');
}
