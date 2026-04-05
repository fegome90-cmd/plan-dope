import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { now } from './create.js';
import { fingerprint } from './derive.js';
import { findPlanId, getPlanDir } from './resolver.js';
import { updateState } from './state.js';
export async function validatePlan(projectRoot, planId) {
    const id = findPlanId(projectRoot, planId);
    const planDir = getPlanDir(projectRoot, id);
    const yamlPath = join(planDir, 'plan.yaml');
    if (!existsSync(yamlPath)) {
        throw new Error(`plan.yaml not found for plan '${id}'. Run \`plan derive\` first.`);
    }
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const parsed = parse(yamlContent);
    const yamlFp = fingerprint(yamlContent);
    const errors = [];
    const warnings = [];
    // Validate required fields
    const requiredFields = [
        'plan_id',
        'source_md_path',
        'source_md_fingerprint',
        'derived_at',
        'scope',
        'phases',
        'risks',
        'validation_criteria',
    ];
    for (const field of requiredFields) {
        if (!(field in parsed)) {
            errors.push({ field, message: `Missing required field: ${field}` });
        }
    }
    // Validate phases structure
    if (Array.isArray(parsed.phases)) {
        if (parsed.phases.length === 0) {
            warnings.push('No phases defined');
        }
        for (let i = 0; i < parsed.phases.length; i++) {
            const phase = parsed.phases[i];
            if (!phase.name) {
                errors.push({ field: `phases[${i}]`, message: 'Phase missing name' });
            }
        }
    }
    else {
        errors.push({ field: 'phases', message: 'Phases must be an array' });
    }
    // Validate risks structure
    if (Array.isArray(parsed.risks)) {
        for (let i = 0; i < parsed.risks.length; i++) {
            const risk = parsed.risks[i];
            if (!risk.description) {
                errors.push({ field: `risks[${i}]`, message: 'Risk missing description' });
            }
            if (risk.severity && !['low', 'medium', 'high'].includes(risk.severity)) {
                errors.push({
                    field: `risks[${i}].severity`,
                    message: `Invalid severity: ${risk.severity}`,
                });
            }
        }
    }
    else {
        errors.push({ field: 'risks', message: 'Risks must be an array' });
    }
    const status = errors.length === 0 ? 'valid' : 'invalid';
    const report = {
        plan_id: parsed.plan_id,
        plan_yaml_fingerprint: yamlFp,
        validated_at: now(),
        status,
        errors,
        warnings,
    };
    const reportPath = join(planDir, 'validation-report.yaml');
    writeFileSync(reportPath, stringify(report), 'utf-8');
    if (status === 'valid') {
        updateState(planDir, 'VALIDATED');
    }
    return reportPath;
}
//# sourceMappingURL=validate.js.map