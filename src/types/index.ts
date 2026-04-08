// Tipos canónicos del dominio plan_dope v1

// Estados del plan según ARCHITECTURE-v1.md
export type PlanState = 'DRAFT' | 'DERIVED' | 'VALIDATED' | 'REVIEWED' | 'HANDOFF_READY';

// Veredictos de review según ARCHITECTURE-v1.md
export type ReviewVerdict = 'PASS' | 'PASS_WITH_NOTES' | 'FAIL';

// Razones de handoff según ARCHITECTURE-v1.md
export type HandoffReason = 'pause' | 'transfer' | 'completion';

// Metadata mínima de un plan
export interface PlanMetadata {
  plan_id: string;
  created_at: string;
  updated_at: string;
  state: PlanState;
  cycle_index?: number;
  source_md_path?: string;
  source_md_fingerprint?: string;
}

// ==========================================
// Fase B: MVP Plan Vivo - Tipos de Ciclo
// ==========================================

/**
 * Referencia inmutable a un hallazgo de un ciclo específico.
 * Formato oblilgatorio: `<run-id>:<finding-code>`
 */
export type FindingRef = `${string}:${string}`;

/**
 * Metadata inmutable guardada en history/cycle-<N>/meta.json
 */
export interface CycleMeta {
  cycle_index: number;
  closed_at: string;
  plan_md_fingerprint: string;
  final_verdict: ReviewVerdict;
  review_run_id: string;
}

// Shape mínimo de plan.yaml según ARCHITECTURE-v1.md
// Campos requeridos + campos opcionales extendidos para interoperabilidad
export interface PlanYaml {
  // --- Required fields (v1 minimum) ---
  plan_id: string;
  source_md_path: string;
  source_md_fingerprint: string;
  derived_at: string;
  scope: string;
  phases: Phase[];
  risks: Risk[];
  validation_criteria: string[];

  // --- Optional extended fields (v1+) ---
  /** Free-form tags for filtering and search */
  tags?: string[];
  /** Person or role responsible for this plan */
  assignee?: string;
  /** Plan IDs this plan depends on */
  dependencies?: string[];
  /** Human-readable effort estimate (e.g. "3d", "1w", "2sprints") */
  estimated_effort?: string;
}

export interface Phase {
  name: string;
  description: string;
  tasks?: string[];
}

export interface Risk {
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation?: string;
}

// Shape mínimo de validation-report.yaml
export interface ValidationReport {
  plan_id: string;
  plan_yaml_fingerprint: string;
  validated_at: string;
  status: 'valid' | 'invalid';
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// Shape mínimo de review-report.md
export interface ReviewReport {
  run_id: string;
  plan_id: string;
  plan_md_fingerprint: string;
  reviewed_at: string;
  verdict: ReviewVerdict;
  findings: Finding[];
  notes: string[];
}

export type FindingCategory = 'validation' | 'completeness' | 'structural' | 'consistency';

export interface Finding {
  id: string; // e.g. "F-01"
  severity: 'critical' | 'warning' | 'suggestion';
  category: FindingCategory;
  description: string;
}

// Payload mínimo hacia checkpoint-card
export interface CheckpointPayload {
  name: string;
  current_plan: string;
  completed_tasks: string[];
  pending_tasks: string[];
  pending_errors: string[];
  next_agent_prompt: string;
  validation_report: string;
  handoff_reason: HandoffReason;
  delegation_context?: Record<string, unknown>;
}

// Configuración global del CLI
export interface CliConfig {
  artifacts_base_path?: string; // default: _ctx/plans/
}

// Opciones compartidas entre comandos
export interface CommandOptions {
  project?: string;
}

export type DriftOutcome =
  | { type: 'no-drift' }
  | { type: 'no-existing-yaml' }
  | { type: 'drift-detected'; archivedTo: string }
  | { type: 'yaml-corrupt'; error: string };
