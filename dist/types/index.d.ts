export type PlanState = 'DRAFT' | 'DERIVED' | 'VALIDATED' | 'REVIEWED' | 'HANDOFF_READY';
export type ReviewVerdict = 'PASS' | 'PASS_WITH_NOTES' | 'FAIL';
export type HandoffReason = 'pause' | 'transfer' | 'completion';
export interface PlanMetadata {
    plan_id: string;
    created_at: string;
    updated_at: string;
    state: PlanState;
    source_md_path?: string;
    source_md_fingerprint?: string;
}
export interface PlanYaml {
    plan_id: string;
    source_md_path: string;
    source_md_fingerprint: string;
    derived_at: string;
    scope: string;
    phases: Phase[];
    risks: Risk[];
    validation_criteria: string[];
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
export interface ReviewReport {
    run_id: string;
    plan_id: string;
    plan_md_fingerprint: string;
    reviewed_at: string;
    verdict: ReviewVerdict;
    findings: Finding[];
    notes: string[];
}
export interface Finding {
    severity: 'critical' | 'warning' | 'suggestion';
    category: string;
    description: string;
}
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
export interface CliConfig {
    default_project_path?: string;
    artifacts_base_path?: string;
}
export interface CommandOptions {
    project?: string;
}
export type DriftOutcome = {
    type: 'no-drift';
} | {
    type: 'no-existing-yaml';
} | {
    type: 'drift-detected';
    archivedTo: string;
} | {
    type: 'yaml-corrupt';
    error: string;
};
//# sourceMappingURL=index.d.ts.map