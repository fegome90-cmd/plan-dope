import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { join } from 'path';
import { createHash } from 'crypto';
import { stringify, parse } from 'yaml';
import { findPlanId, getPlanDir } from './resolver.js';
import { now } from './create.js';
import { updateState } from './state.js';

export function fingerprint(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 12);
}

function parsePlanMarkdown(content: string, id: string) {
  const lines = content.split('\n');

  const scope = extractSection(lines, 'Scope') || 'Not specified';
  const phases = extractPhases(lines);
  const risks = extractRisks(lines);
  const validation_criteria = extractList(lines, 'Validation Criteria');

  return { plan_id: id, scope, phases, risks, validation_criteria };
}

function extractSection(lines: string[], heading: string): string | null {
  const idx = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  if (idx === -1) return null;

  const sectionLines: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break;
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('<!--')) {
      sectionLines.push(trimmed);
    }
  }
  return sectionLines.join(' ') || null;
}

function extractPhases(lines: string[]): Array<{ name: string; description: string }> {
  const phases: Array<{ name: string; description: string }> = [];
  let inPhases = false;

  for (const line of lines) {
    if (line.startsWith('## Phases')) {
      inPhases = true;
      continue;
    }
    if (inPhases) {
      if (line.startsWith('## ')) break;
      if (line.startsWith('### ')) {
        const name = line.replace('### ', '').trim();
        phases.push({ name, description: '' });
      } else if (phases.length > 0 && line.trim() && !line.trim().startsWith('<!--')) {
        phases[phases.length - 1].description += line.trim() + ' ';
      }
    }
  }

  return phases.map((p) => ({ ...p, description: p.description.trim() }));
}

function extractRisks(lines: string[]): Array<{ description: string; severity: 'low' | 'medium' | 'high' }> {
  const risks: Array<{ description: string; severity: 'low' | 'medium' | 'high' }> = [];
  let inRisks = false;

  for (const line of lines) {
    if (line.startsWith('## Risks')) {
      inRisks = true;
      continue;
    }
    if (inRisks) {
      if (line.startsWith('## ')) break;
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') && !trimmed.startsWith('<!--')) {
        risks.push({ description: trimmed.substring(2), severity: 'medium' });
      }
    }
  }

  return risks;
}

function extractList(lines: string[], heading: string): string[] {
  const items: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith(`## ${heading}`)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (line.startsWith('## ')) break;
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') && !trimmed.startsWith('<!--')) {
        items.push(trimmed.substring(2));
      }
    }
  }

  return items;
}

export async function derivePlan(projectRoot: string, planId?: string): Promise<string> {
  const id = findPlanId(projectRoot, planId);
  const planDir = getPlanDir(projectRoot, id);
  const planPath = join(planDir, 'plan.md');

  if (!existsSync(planPath)) {
    throw new Error(`plan.md not found for plan '${id}'`);
  }

  const content = readFileSync(planPath, 'utf-8');
  const fp = fingerprint(content);
  // Drift check before creating new plan.yaml
  checkAndInvalidateDrift(planDir, fp);
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
// Optional helper to archive artifacts when drift is detected
function archiveArtifact(sourcePath: string, destPath: string): void {
  if (existsSync(sourcePath)) {
    writeFileSync(destPath, readFileSync(sourcePath), 'utf-8');
  }
}

// updateState is assumed to be defined elsewhere in the runtime

/**
 * Drift detection and invalidation:
 * - If plan.yaml exists and its source_md_fingerprint differs from currentFingerprint,
 *   archive derivatives to history and reset state to DRAFT.
 */
function checkAndInvalidateDrift(planDir: string, currentFingerprint: string): void {
  const planYamlPath = path.join(planDir, 'plan.yaml');
  if (!existsSync(planYamlPath)) return;

  let existingFingerprint: string | null = null;
  try {
    const planYamlContent = readFileSync(planYamlPath, 'utf8');
    const m = planYamlContent.match(/source_md_fingerprint:\s*([0-9a-fA-F]+)\b/);
    if (m) existingFingerprint = m[1];
  } catch {
    // If parsing fails, skip drift handling
    return;
  }

  if (existingFingerprint && existingFingerprint !== currentFingerprint) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
    const historyDir = path.join(planDir, 'history', timestamp);
    mkdirSync(historyDir, { recursive: true });

    const artifacts = [
      { src: planYamlPath, dest: path.join(historyDir, 'plan.yaml') },
      { src: path.join(planDir, 'validation-report.yaml'), dest: path.join(historyDir, 'validation-report.yaml') },
      { src: path.join(planDir, 'review-report.md'), dest: path.join(historyDir, 'review-report.md') },
    ];

    artifacts.forEach(({ src, dest }) => {
      if (existsSync(src)) {
        const data = readFileSync(src);
        writeFileSync(dest, data);
      }
    });

    // Reset to DRAFT state for new derivation
    updateState(planDir, 'DRAFT');
    console.warn('Plan source changed, invalidating derivatives. Previous artifacts archived to history/.');
  }
}
