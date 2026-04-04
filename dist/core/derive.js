import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { stringify } from 'yaml';
import { findPlanId, getPlanDir } from './resolver.js';
import { now } from './create.js';
import { updateState } from './state.js';
export function fingerprint(content) {
    return createHash('sha256').update(content).digest('hex').substring(0, 12);
}
function parsePlanMarkdown(content, id) {
    const lines = content.split('\n');
    const scope = extractSection(lines, 'Scope') || 'Not specified';
    const phases = extractPhases(lines);
    const risks = extractRisks(lines);
    const validation_criteria = extractList(lines, 'Validation Criteria');
    return { plan_id: id, scope, phases, risks, validation_criteria };
}
function extractSection(lines, heading) {
    const idx = lines.findIndex((l) => l.startsWith(`## ${heading}`));
    if (idx === -1)
        return null;
    const sectionLines = [];
    for (let i = idx + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## '))
            break;
        const trimmed = lines[i].trim();
        if (trimmed && !trimmed.startsWith('<!--')) {
            sectionLines.push(trimmed);
        }
    }
    return sectionLines.join(' ') || null;
}
function extractPhases(lines) {
    const phases = [];
    let inPhases = false;
    for (const line of lines) {
        if (line.startsWith('## Phases')) {
            inPhases = true;
            continue;
        }
        if (inPhases) {
            if (line.startsWith('## '))
                break;
            if (line.startsWith('### ')) {
                const name = line.replace('### ', '').trim();
                phases.push({ name, description: '' });
            }
            else if (phases.length > 0 && line.trim() && !line.trim().startsWith('<!--')) {
                phases[phases.length - 1].description += line.trim() + ' ';
            }
        }
    }
    return phases.map((p) => ({ ...p, description: p.description.trim() }));
}
function extractRisks(lines) {
    const risks = [];
    let inRisks = false;
    for (const line of lines) {
        if (line.startsWith('## Risks')) {
            inRisks = true;
            continue;
        }
        if (inRisks) {
            if (line.startsWith('## '))
                break;
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') && !trimmed.startsWith('<!--')) {
                risks.push({ description: trimmed.substring(2), severity: 'medium' });
            }
        }
    }
    return risks;
}
function extractList(lines, heading) {
    const items = [];
    let inSection = false;
    for (const line of lines) {
        if (line.startsWith(`## ${heading}`)) {
            inSection = true;
            continue;
        }
        if (inSection) {
            if (line.startsWith('## '))
                break;
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') && !trimmed.startsWith('<!--')) {
                items.push(trimmed.substring(2));
            }
        }
    }
    return items;
}
export async function derivePlan(projectRoot, planId) {
    const id = findPlanId(projectRoot, planId);
    const planDir = getPlanDir(projectRoot, id);
    const planPath = join(planDir, 'plan.md');
    if (!existsSync(planPath)) {
        throw new Error(`plan.md not found for plan '${id}'`);
    }
    const content = readFileSync(planPath, 'utf-8');
    const fp = fingerprint(content);
    const parsed = parsePlanMarkdown(content, id);
    const yamlContent = {
        plan_id: parsed.plan_id,
        source_md_path: planPath,
        source_md_fingerprint: fp,
        derived_at: now(),
        scope: parsed.scope,
        phases: parsed.phases,
        risks: parsed.risks,
        validation_criteria: parsed.validation_criteria,
    };
    const yamlPath = join(planDir, 'plan.yaml');
    writeFileSync(yamlPath, stringify(yamlContent), 'utf-8');
    updateState(planDir, 'DERIVED');
    return yamlPath;
}
//# sourceMappingURL=derive.js.map