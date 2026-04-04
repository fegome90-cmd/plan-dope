import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PlanState } from '../types/index.js';
import { findPlanId, getPlanDir } from './resolver.js';
import { now } from './create.js';

interface StateFile {
  plan_id: string;
  state: PlanState;
  created_at: string;
  updated_at: string;
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
  return JSON.parse(readFileSync(statePath, 'utf-8'));
}

export function updateState(planDir: string, newState: PlanState): void {
  const state = readState(planDir);
  state.state = newState;
  state.updated_at = now();
  writeFileSync(join(planDir, '.state.json'), JSON.stringify(state, null, 2), 'utf-8');
}
