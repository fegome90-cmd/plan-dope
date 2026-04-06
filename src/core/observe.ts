import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveArtifactsBasePath } from './config.js';
import { fingerprint } from './derive.js';
import { findPlanId, getPlanDir } from './resolver.js';
import { readState } from './state.js';
import { now } from './utils.js';

const FINDING_REF_RE = /^review-[a-z0-9]+-[a-z0-9]+:F-\d{2}$/;

export interface ObserveOptions {
  comment?: string;
  correct?: string;
  finding?: string;
}

export async function observePlan(
  projectRoot: string,
  options: ObserveOptions,
  planId?: string
): Promise<string[]> {
  const artifactsBase = resolveArtifactsBasePath(projectRoot);
  const id = findPlanId(projectRoot, planId, artifactsBase);
  const planDir = getPlanDir(projectRoot, id, artifactsBase);

  if (options.finding && !FINDING_REF_RE.test(options.finding)) {
    throw new Error(
      `Invalid finding_ref format: "${options.finding}". Expected <run-id>:F-XX (e.g., review-abc123:F-01).`
    );
  }

  // We ensure state is initialized
  readState(planDir);

  const updatedFiles: string[] = [];
  const planPath = join(planDir, 'plan.md');

  let currentFingerprint = 'unknown';
  if (existsSync(planPath)) {
    currentFingerprint = fingerprint(readFileSync(planPath, 'utf-8'));
  }

  if (options.comment) {
    const obsPath = join(planDir, 'observations.md');
    let content = '';
    if (!existsSync(obsPath)) {
      content += '# Observations\n\n';
    } else {
      content = '\n'; // separator if file exists
    }
    content += `- **[${now()}]**: ${options.comment}\n`;
    appendFileSync(obsPath, content, 'utf-8');
    updatedFiles.push(obsPath);
  }

  if (options.correct) {
    const corrPath = join(planDir, 'corrections-log.md');
    let content = '';
    if (!existsSync(corrPath)) {
      content += '# Corrections Log\n\n';
    } else {
      content = '\n';
    }

    const findingPart = options.finding ? ` | finding: ${options.finding}` : '';
    content += `<!-- correction: ${now()} | fingerprint_before: ${currentFingerprint}${findingPart} -->\n`;
    content += `${options.correct}\n`;

    appendFileSync(corrPath, content, 'utf-8');
    updatedFiles.push(corrPath);
  }

  if (!options.comment && !options.correct) {
    // If no flags were passed, we just return empty so CLI can spawn an editor
    // Right now the core just returns an empty list
    return [];
  }

  return updatedFiles;
}
