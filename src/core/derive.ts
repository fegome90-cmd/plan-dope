import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import type { DriftOutcome, PlanYaml } from '../types/index.js';
import { resolveArtifactsBasePath } from './config.js';
import { findPlanId, getPlanDir } from './resolver.js';
import { updateState } from './state.js';
import { now } from './utils.js';

export function fingerprint(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 12);
}

export function verifyFingerprintCoherency(planDir: string, currentFp: string): void {
  const yamlPath = join(planDir, 'plan.yaml');
  if (!existsSync(yamlPath)) {
    throw new Error('plan.yaml not found. Run `plan derive` first.');
  }
  const yamlContent = readFileSync(yamlPath, 'utf-8');
  const yamlParsed = parse(yamlContent);
  const storedFp =
    typeof yamlParsed?.source_md_fingerprint === 'string'
      ? yamlParsed.source_md_fingerprint
      : undefined;
  if (storedFp && storedFp !== currentFp) {
    throw new Error(
      `fingerprint mismatch: plan.md (${currentFp}) does not match plan.yaml source fingerprint (${storedFp}). Re-run \`plan derive\`.`
    );
  }
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

function getSectionLines(lines: string[], heading: string): string[] | null {
  const idx = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  if (idx === -1) return null;
  const sectionLines: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.startsWith('## ')) break;
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('<!--')) {
      sectionLines.push(trimmed);
    }
  }
  return sectionLines.length > 0 ? sectionLines : null;
}

function extractSection(lines: string[], heading: string): string | null {
  const sectionLines = getSectionLines(lines, heading);
  return sectionLines?.join(' ') ?? null;
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
        const last = phases[phases.length - 1];
        if (last) last.description += `${line.trim()} `;
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
  const sectionLines = getSectionLines(lines, 'Tags');
  if (!sectionLines || sectionLines.length === 0) return undefined;

  const raw = sectionLines.join(', ');
  const tags = raw
    .split(/[,\n]/)
    .map((t) => t.replace(/^- /, '').trim())
    .filter(Boolean);

  return tags.length > 0 ? tags : undefined;
}

function extractAssignee(lines: string[]): string | undefined {
  const sectionLines = getSectionLines(lines, 'Assignee');
  return sectionLines?.at(0);
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
  const sectionLines = getSectionLines(lines, 'Estimated Effort');
  return sectionLines?.at(0);
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
    const fp = parsed?.source_md_fingerprint;
    existingFingerprint = typeof fp === 'string' ? fp : null;
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

    for (const { src, dest } of artifacts) {
      if (existsSync(src)) {
        const data = readFileSync(src);
        writeFileSync(dest, data);
      }
    }

    updateState(planDir, 'DRAFT');
    return { type: 'drift-detected', archivedTo: historyDir };
  }

  return { type: 'no-drift' };
}

export async function derivePlan(projectRoot: string, planId?: string): Promise<string> {
  const artifactsBase = resolveArtifactsBasePath(projectRoot);
  const id = findPlanId(projectRoot, planId, artifactsBase);
  const planDir = getPlanDir(projectRoot, id, artifactsBase);
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
