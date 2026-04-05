import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import type { Finding, ReviewVerdict } from '../types/index.js';
import { now } from './create.js';
import { fingerprint } from './derive.js';
import { findPlanId, getPlanDir } from './resolver.js';
import { updateState } from './state.js';

export async function reviewPlan(projectRoot: string, planId?: string): Promise<string> {
  const id = findPlanId(projectRoot, planId);
  const planDir = getPlanDir(projectRoot, id);

  const planPath = join(planDir, 'plan.md');
  const yamlPath = join(planDir, 'plan.yaml');
  const validationPath = join(planDir, 'validation-report.yaml');

  if (!existsSync(planPath)) throw new Error(`plan.md not found for plan '${id}'`);
  if (!existsSync(yamlPath)) throw new Error(`plan.yaml not found. Run \`plan derive\` first.`);
  if (!existsSync(validationPath))
    throw new Error(`validation-report.yaml not found. Run \`plan validate\` first.`);

  const validationContent = readFileSync(validationPath, 'utf-8');
  const validationReport = parse(validationContent);

  const planContent = readFileSync(planPath, 'utf-8');
  const planFp = fingerprint(planContent);

  // Verify fingerprint coherency: plan.md must match the fingerprint stored in plan.yaml
  const yamlContent = readFileSync(yamlPath, 'utf-8');
  const yamlParsed = parse(yamlContent);
  const storedFingerprint = yamlParsed?.source_md_fingerprint as string | undefined;
  if (storedFingerprint && storedFingerprint !== planFp) {
    throw new Error(
      `fingerprint mismatch: plan.md (${planFp}) does not match plan.yaml source fingerprint (${storedFingerprint}). Re-run \`plan derive\`.`
    );
  }

  // Verify validation-report corresponds to current plan.yaml
  const yamlFp = fingerprint(yamlContent);
  const validationYamlFp = validationReport.plan_yaml_fingerprint as string | undefined;
  if (validationYamlFp && validationYamlFp !== yamlFp) {
    throw new Error(
      `validation-report.yaml is stale (fingerprint ${validationYamlFp}) and does not match current plan.yaml (${yamlFp}). Re-run \`plan validate\`.`
    );
  }

  const runId = `review-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const findings: Finding[] = [];

  // If validation failed, that's a critical finding
  if (validationReport.status === 'invalid') {
    for (const error of validationReport.errors || []) {
      findings.push({
        severity: 'critical',
        category: 'validation',
        description: `Validation error: ${error.field} — ${error.message}`,
      });
    }
  }

  // Add warnings as findings
  for (const warning of validationReport.warnings || []) {
    findings.push({
      severity: 'warning',
      category: 'validation',
      description: warning,
    });
  }

  // Structural review checks
  if (
    !planContent.includes('## Purpose') ||
    planContent.includes('<!-- Describe what this plan is about -->')
  ) {
    findings.push({
      severity: 'warning',
      category: 'completeness',
      description: 'Purpose section appears to be a template placeholder',
    });
  }

  if (!planContent.includes('## Phases') || planContent.includes('<!-- name -->')) {
    findings.push({
      severity: 'warning',
      category: 'completeness',
      description: 'Phases section appears to be a template placeholder',
    });
  }

  // Determine verdict
  const hasCritical = findings.some((f) => f.severity === 'critical');
  const verdict: ReviewVerdict = hasCritical
    ? 'FAIL'
    : findings.length > 0
      ? 'PASS_WITH_NOTES'
      : 'PASS';

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
  const reviewRunsDir = join(projectRoot, '_ctx', 'review_runs', runId);
  mkdirSync(reviewRunsDir, { recursive: true });
  writeFileSync(
    join(reviewRunsDir, 'input-ref.yaml'),
    `plan_id: ${id}\nplan_md_fingerprint: ${planFp}\n`,
    'utf-8'
  );
  writeFileSync(join(reviewRunsDir, 'findings.yaml'), stringify(findings), 'utf-8');
  writeFileSync(
    join(reviewRunsDir, 'summary.md'),
    `Verdict: ${verdict}\nFindings: ${findings.length}\n`,
    'utf-8'
  );

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
  const suggestions = report.findings.filter((f) => f.severity === 'suggestion');

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
${criticalFindings.length > 0 ? criticalFindings.map((f) => `- **[${f.category}]** ${f.description}`).join('\n') : 'None'}

### Warnings (${warnings.length})
${warnings.length > 0 ? warnings.map((f) => `- **[${f.category}]** ${f.description}`).join('\n') : 'None'}

### Suggestions (${suggestions.length})
${suggestions.length > 0 ? suggestions.map((f) => `- **[${f.category}]** ${f.description}`).join('\n') : 'None'}

## Notes

${report.notes.map((n) => `- ${n}`).join('\n')}

---
Generated by plan_dope v0.1.0
`;
}
