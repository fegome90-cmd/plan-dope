import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { Finding, ReviewVerdict, ValidationReport } from '../types/index.js';
import { resolveArtifactsBasePath } from './config.js';
import { fingerprint, verifyFingerprintCoherency } from './derive.js';
import { findPlanId, getPlanDir } from './resolver.js';
import { updateState } from './state.js';
import { now } from './utils.js';

export async function reviewPlan(projectRoot: string, planId?: string): Promise<string> {
  const artifactsBase = resolveArtifactsBasePath(projectRoot);
  const id = findPlanId(projectRoot, planId, artifactsBase);
  const planDir = getPlanDir(projectRoot, id, artifactsBase);

  const planPath = join(planDir, 'plan.md');
  const yamlPath = join(planDir, 'plan.yaml');
  const validationPath = join(planDir, 'validation-report.yaml');

  if (!existsSync(planPath)) throw new Error(`plan.md not found for plan '${id}'`);
  if (!existsSync(yamlPath)) throw new Error('plan.yaml not found. Run `plan derive` first.');
  if (!existsSync(validationPath))
    throw new Error('validation-report.yaml not found. Run `plan validate` first.');

  const validationContent = readFileSync(validationPath, 'utf-8');
  const validationReport = parse(validationContent);

  const planContent = readFileSync(planPath, 'utf-8');
  const planFp = fingerprint(planContent);

  verifyFingerprintCoherency(planDir, planFp);
  const yamlContent = readFileSync(yamlPath, 'utf-8');

  // Verify validation-report corresponds to current plan.yaml
  const yamlFp = fingerprint(yamlContent);
  const validationYamlFp = validationReport.plan_yaml_fingerprint as string | undefined;
  if (!validationYamlFp) {
    throw new Error(
      'validation-report.yaml missing plan_yaml_fingerprint; re-run `plan validate`.'
    );
  }
  if (validationYamlFp !== yamlFp) {
    throw new Error(
      `validation-report.yaml is stale (fingerprint ${validationYamlFp}) and does not match current plan.yaml (${yamlFp}). Re-run \`plan validate\`.`
    );
  }

  const runId = `review-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const findings = collectFindings(validationReport, planContent);
  const verdict = determineVerdict(findings);

  const report = {
    run_id: runId,
    plan_id: id,
    plan_md_fingerprint: planFp,
    reviewed_at: now(),
    verdict,
    findings,
    notes:
      findings.length > 0
        ? ['Review completed with findings. Address critical items before proceeding.']
        : ['Review completed. No issues found.'],
  };

  // Write review report
  const reportPath = join(planDir, 'review-report.md');
  const markdown = generateReviewMarkdown(report);
  writeFileSync(reportPath, markdown, 'utf-8');

  // Write review run artifacts
  const reviewRunsDir = join(projectRoot, artifactsBase, 'review_runs', runId);
  mkdirSync(reviewRunsDir, { recursive: true });
  writeFileSync(
    join(reviewRunsDir, 'input-ref.yaml'),
    `plan_id: ${id}\nplan_md_fingerprint: ${planFp}\n`,
    'utf-8'
  );

  // Write structured summary.json — artefacto auxiliar para consumo de runtime (close.ts).
  // review-report.md sigue siendo la superficie humana vigente; summary.json NO es fuente de verdad.
  const summaryJson = {
    run_id: runId,
    plan_id: id,
    plan_md_fingerprint: planFp,
    verdict,
    reviewed_at: now(),
  };
  writeFileSync(join(reviewRunsDir, 'summary.json'), JSON.stringify(summaryJson, null, 2), 'utf-8');

  // Update state based on verdict
  if (verdict === 'FAIL') {
    updateState(planDir, 'DRAFT');
  } else {
    updateState(planDir, 'REVIEWED');
  }

  return reportPath;
}

function generateReviewMarkdown(report: {
  run_id: string;
  plan_id: string;
  plan_md_fingerprint: string;
  reviewed_at: string;
  verdict: string;
  findings: Finding[];
  notes: string[];
}): string {
  const criticalFindings = report.findings.filter((f) => f.severity === 'critical');
  const warnings = report.findings.filter((f) => f.severity === 'warning');

  return `# Review Report: ${report.plan_id}

## Summary

| Field | Value |
|-------|-------|
| Run ID | ${report.run_id} |
| Plan ID | ${report.plan_id} |
| Plan Fingerprint | ${report.plan_md_fingerprint} |
| Reviewed At | ${report.reviewed_at} |
| Verdict | **${report.verdict}** |

## Findings

### Critical (${criticalFindings.length})
${criticalFindings.length > 0 ? criticalFindings.map((f) => `- **[${f.id}] [${f.category}]** ${f.description}`).join('\n') : 'None'}

### Warnings (${warnings.length})
${warnings.length > 0 ? warnings.map((f) => `- **[${f.id}] [${f.category}]** ${f.description}`).join('\n') : 'None'}

## Contradicciones detectadas

None

## Próximos pasos

${report.notes.map((n) => `- ${n}`).join('\n')}
`;
}

function collectFindings(validationReport: ValidationReport, planContent: string): Finding[] {
  const findings: Omit<Finding, 'id'>[] = [];

  const addCritical = (desc: string) =>
    findings.push({ severity: 'critical', category: 'validation', description: desc });
  const addWarning = (cat: Finding['category'], desc: string) =>
    findings.push({ severity: 'warning', category: cat, description: desc });

  if (validationReport.status === 'invalid') {
    for (const error of validationReport.errors || []) {
      addCritical(`Validation error: ${error.field} — ${error.message}`);
    }
  }

  for (const warning of validationReport.warnings || []) {
    addWarning('validation', warning);
  }

  if (
    !planContent.includes('## Purpose') ||
    planContent.includes('<!-- Describe what this plan is about -->')
  ) {
    addWarning('completeness', 'Purpose section appears to be a template placeholder');
  }

  if (!planContent.includes('## Phases') || planContent.includes('<!-- name -->')) {
    addWarning('completeness', 'Phases section appears to be a template placeholder');
  }

  return findings.map((f, idx) => ({ ...f, id: `F-${(idx + 1).toString().padStart(2, '0')}` }));
}

function determineVerdict(findings: Finding[]): ReviewVerdict {
  if (findings.some((f) => f.severity === 'critical')) return 'FAIL';
  if (findings.length > 0) return 'PASS_WITH_NOTES';
  return 'PASS';
}
