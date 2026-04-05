import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import type { DriftOutcome, PlanYaml } from '../types/index.js';
import { now } from './create.js';
import { findPlanId, getPlanDir } from './resolver.js';
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
  const tags = extractTags(lines);
  const assignee = extractAssignee(lines);
  const dependencies = extractDependencies(lines);
  const estimated_effort = extractEstimatedEffort(lines);

  return {
    plan_id: id,
    scope,
    phases,
    risks,
    validation_criteria,
    tags,
    assignee,
    dependencies,
    estimated_effort,
  };
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
        phases[phases.length - 1].description += `${line.trim()} `;
      }
    }
  }

  return phases.map((p) => ({ ...p, description: p.description.trim() }));
}

function extractRisks(
  lines: string[]
): Array<{ description: string; severity: 'low' | 'medium' | 'high'; mitigation?: string }> {
  const risks: Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
    mitigation?: string;
  }> = [];
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
        const content = trimmed.substring(2);
        const pipeIdx = content.indexOf('|');
        if (pipeIdx !== -1) {
          risks.push({
            description: content.substring(0, pipeIdx).trim(),
            severity: 'medium',
            mitigation: content.substring(pipeIdx + 1).trim() || undefined,
          });
        } else {
          risks.push({ description: content, severity: 'medium' });
        }
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

/**
 * Extract tags from the ## Tags section.
 * Supports both comma-separated on a single line and bullet lists.
 */
function extractTags(lines: string[]): string[] | undefined {
  const idx = lines.findIndex((l) => l.startsWith('## Tags'));
  if (idx === -1) return undefined;

  const tagLines: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break;
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('<!--')) {
      tagLines.push(trimmed);
    }
  }

  if (tagLines.length === 0) return undefined;

  const raw = tagLines.join(', ');
  const tags = raw
    .split(/[,\n]/)
    .map((t) => t.replace(/^- /, '').trim())
    .filter(Boolean);

  return tags.length > 0 ? tags : undefined;
}

/**
 * Extract assignee from the ## Assignee section.
 */
function extractAssignee(lines: string[]): string | undefined {
  const idx = lines.findIndex((l) => l.startsWith('## Assignee'));
  if (idx === -1) return undefined;

  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break;
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('<!--')) {
      return trimmed;
    }
  }

  return undefined;
}

/**
 * Extract dependencies from the ## Dependencies section.
 * Each line should be a plan ID (bullet list or plain text).
 */
function extractDependencies(lines: string[]): string[] | undefined {
  const deps = extractList(lines, 'Dependencies');
  return deps.length > 0 ? deps : undefined;
}

/**
 * Extract estimated effort from the ## Estimated Effort section.
 * Returns the first non-comment line as a string.
 */
function extractEstimatedEffort(lines: string[]): string | undefined {
  const idx = lines.findIndex((l) => l.startsWith('## Estimated Effort'));
  if (idx === -1) return undefined;

  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break;
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('<!--')) {
      return trimmed;
    }
  }

  return undefined;
}

/**
 * Drift detection and invalidation:
 * - If plan.yaml exists and its source_md_fingerprint differs from currentFingerprint,
 *   archive derivatives to history and reset state to DRAFT.
 * - Returns a structured DriftOutcome instead of void/console.warn.
 */
export function checkAndInvalidateDrift(planDir: string, currentFingerprint: string): DriftOutcome {
  const planYamlPath = join(planDir, 'plan.yaml');
  if (!existsSync(planYamlPath)) return { type: 'no-existing-yaml' };

  let existingFingerprint: string | null = null;
  try {
    const planYamlContent = readFileSync(planYamlPath, 'utf8');
    const hasBinaryData = [...planYamlContent].some((c) => {
      const code = c.charCodeAt(0);
      return (
        (code >= 0 && code <= 8) ||
        code === 11 ||
        code === 12 ||
        (code >= 14 && code <= 31) ||
        code === 127
      );
    });
    if (hasBinaryData) {
      return { type: 'yaml-corrupt', error: 'file contains non-text binary data' };
    }
    const parsed = parse(planYamlContent);
    existingFingerprint = (parsed?.source_md_fingerprint as string | undefined) ?? null;
  } catch (e) {
    return { type: 'yaml-corrupt', error: e instanceof Error ? e.message : String(e) };
  }

  if (existingFingerprint && existingFingerprint !== currentFingerprint) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
    const historyDir = join(planDir, 'history', timestamp);
    mkdirSync(historyDir, { recursive: true });

    const artifacts = [
      { src: planYamlPath, dest: join(historyDir, 'plan.yaml') },
      {
        src: join(planDir, 'validation-report.yaml'),
        dest: join(historyDir, 'validation-report.yaml'),
      },
      { src: join(planDir, 'review-report.md'), dest: join(historyDir, 'review-report.md') },
    ];

    artifacts.forEach(({ src, dest }) => {
      if (existsSync(src)) {
        const data = readFileSync(src);
        writeFileSync(dest, data);
      }
    });

    updateState(planDir, 'DRAFT');
    return { type: 'drift-detected', archivedTo: historyDir };
  }

  return { type: 'no-drift' };
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
  const driftOutcome = checkAndInvalidateDrift(planDir, fp);
  if (driftOutcome.type === 'yaml-corrupt') {
    throw new Error(`plan.yaml is corrupt and cannot be read: ${driftOutcome.error}`);
  }
  const parsed = parsePlanMarkdown(content, id);

  const yamlContent: PlanYaml = {
    plan_id: parsed.plan_id,
    source_md_path: planPath,
    source_md_fingerprint: fp,
    derived_at: now(),
    scope: parsed.scope,
    phases: parsed.phases,
    risks: parsed.risks,
    validation_criteria: parsed.validation_criteria,
  };

  // Only include optional fields when they have values
  if (parsed.tags) yamlContent.tags = parsed.tags;
  if (parsed.assignee) yamlContent.assignee = parsed.assignee;
  if (parsed.dependencies) yamlContent.dependencies = parsed.dependencies;
  if (parsed.estimated_effort) yamlContent.estimated_effort = parsed.estimated_effort;

  const yamlPath = join(planDir, 'plan.yaml');
  writeFileSync(yamlPath, stringify(yamlContent), 'utf-8');

  updateState(planDir, 'DERIVED');

  return yamlPath;
}
