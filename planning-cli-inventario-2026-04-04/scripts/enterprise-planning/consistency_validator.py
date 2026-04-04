"""
Consistency Validator Module for Work Orders.

Cross-validates objective vs Definition of Done (DoD) to detect:
1. Missing keywords (objective mentions "rotation" but DoD doesn't test it)
2. Quantitative mismatches (objective says "< 100ms", DoD says "< 200ms")
3. Contradictions (objective says "remove endpoint", DoD tests it works)
4. Vague thresholds (threshold is "fast" instead of specific metric)

Usage:
    python -m scripts.lib.consistency_validator <work_orders_dir> [options]
"""

import argparse
import re
import sys
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import List, Set, Tuple

from scripts.lib.types import (
    WorkOrder,
    ConsistencyIssue,
    ConsistencyValidationResult,
)
from scripts.lib.yaml_utils import safe_load_all


# =============================================================================
# Constants
# =============================================================================

TECHNICAL_TERMS_PATTERN = re.compile(r'\b[A-Z]{2,}\b')

ACTION_VERBS = {
    'authenticate', 'authorize', 'validate', 'verify', 'encrypt', 'decrypt',
    'rotate', 'refresh', 'expire', 'cache', 'invalidate', 'persist', 'query',
    'create', 'read', 'update', 'delete', 'list', 'search', 'filter'
}

DOMAIN_TERMS = {
    'credential', 'token', 'session', 'cookie', 'jwt', 'oauth', 'ldap',
    'password', 'hash', 'salt', 'bcrypt', 'encryption', 'signature',
    'certificate', 'key', 'secret', 'api', 'endpoint', 'route', 'handler'
}

STOP_WORDS = {
    'the', 'a', 'an', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with',
    'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'must', 'shall', 'when', 'then',
    'implement', 'add', 'create', 'make', 'get', 'set', 'use', 'ensure',
    'provide', 'allow', 'enable', 'disable', 'improve', 'enhance',
    'authentication', 'authorization', 'security', 'system', 'application'
}

QUANTITY_PATTERN = re.compile(r'\b(\d+)\s*(?:ms|milliseconds?|seconds?|minutes?|hours?|days?)\b')
OPERATOR_PATTERN = re.compile(r'[<>]=?\s*\d+')

VAGUE_THRESHOLD_TERMS = {'fast', 'good', 'bad', 'slow', 'nice', 'well', 'better', 'best', 'quick', 'responsive'}

CONTRADICTION_INDICATORS = {'remove', 'delete', 'deprecate', 'disable', 'eliminate'}

POSITIVE_INDICATORS = {'works', 'responds', 'returns', 'succeeds', 'passes', 'valid', 'exists'}

SEVERITY_WEIGHTS = {"critical": 10, "high": 5, "medium": 2, "low": 1}


# =============================================================================
# Keyword Extraction
# =============================================================================

def extract_keywords_from_text(text: str) -> Set[str]:
    """Extract significant keywords from text using NLP-lite approach."""
    if not text:
        return set()

    keywords = set()
    text_lower = text.lower()

    # Technical terms (acronyms, capitalized words)
    for match in TECHNICAL_TERMS_PATTERN.finditer(text):
        keywords.add(match.group(0).lower())

    # Action verbs and domain terms
    for term in ACTION_VERBS | DOMAIN_TERMS:
        if term in text_lower:
            keywords.add(term)

    # Quantities with units
    for match in QUANTITY_PATTERN.finditer(text):
        keywords.add(match.group(0))

    # Operators with numbers
    for match in OPERATOR_PATTERN.finditer(text):
        keywords.add(match.group(0))

    # Significant words (3+ chars, not stop words)
    words = re.findall(r'\b[a-z]{3,}\b', text_lower)
    keywords.update(word for word in words if word not in STOP_WORDS)

    return keywords


# =============================================================================
# Fuzzy Keyword Matching
# =============================================================================

def keyword_matches_fuzzy(keyword: str, text: str, threshold: float = 0.6) -> float:
    """Calculate similarity ratio for fuzzy keyword matching."""
    if not keyword or not text:
        return 0.0

    text_lower, keyword_lower = text.lower(), keyword.lower()

    # Exact match
    if keyword_lower in text_lower:
        return 1.0

    # Fuzzy match
    ratio = SequenceMatcher(None, keyword_lower, text_lower).ratio()
    return ratio if ratio >= threshold else 0.0


# =============================================================================
# Quantitative Extraction
# =============================================================================

def extract_quantities(text: str) -> List[Tuple[str, float, str]]:
    """Extract quantitative statements from text."""
    quantities = []
    pattern = re.compile(r'([<>]=?)?\s*(\d+(?:\.\d+)?)\s*(ms|milliseconds?|seconds?|minutes?|hours?|days?|%)', re.IGNORECASE)

    for match in pattern.finditer(text):
        operator = match.group(1) or ''
        value_str = match.group(2)
        value = float(value_str) if '.' in value_str else int(value_str)
        unit = match.group(3).lower()
        quantities.append((operator, value, unit))

    return quantities


# =============================================================================
# Consistency Validation
# =============================================================================

def validate_single_wo_consistency(
    wo: WorkOrder,
    fuzzy_threshold: float = 0.6
) -> List[ConsistencyIssue]:
    """Check if objective keywords are validated in DoD with fuzzy matching."""
    issues = []
    objective_keywords = extract_keywords_from_text(wo.objective)

    dod_texts = [
        f"{dod.verification} {dod.command} {dod.expected_output} {dod.threshold}"
        for dod in wo.definition_of_done
    ]

    # Check for missing keywords
    skip_words = {'user', 'system', 'application', 'service', 'endpoint', 'api'}
    for keyword in objective_keywords - skip_words:
        if not any(keyword_matches_fuzzy(keyword, dod_text, fuzzy_threshold) >= fuzzy_threshold
                   for dod_text in dod_texts):
            excerpt = keyword[:50] + "..." if len(keyword) > 50 else keyword
            issues.append(ConsistencyIssue(
                wo_id=wo.id,
                issue_type="missing_keyword",
                severity="medium",
                objective_excerpt=excerpt,
                dod_excerpt=None,
                description=f"Keyword '{keyword}' found in objective but not validated in DoD",
                suggestion=f"Add DoD entry that verifies '{keyword}' behavior"
            ))

    # Check for quantitative mismatches
    objective_quantities = extract_quantities(wo.objective)
    dod_quantities = []
    for dod in wo.definition_of_done:
        dod_text = f"{dod.verification} {dod.expected_output} {dod.threshold}"
        dod_quantities.extend(extract_quantities(dod_text))

    if objective_quantities and dod_quantities:
        obj_qty, dod_qty = objective_quantities[0], dod_quantities[0]
        if obj_qty[2] == dod_qty[2] and (obj_qty[0] != dod_qty[0] or abs(obj_qty[1] - dod_qty[1]) > 0):
            obj_str = f"{obj_qty[0]}{obj_qty[1]}{obj_qty[2]}"
            dod_str = f"{dod_qty[0]}{dod_qty[1]}{dod_qty[2]}"
            issues.append(ConsistencyIssue(
                wo_id=wo.id,
                issue_type="quantitative_mismatch",
                severity="high",
                objective_excerpt=obj_str,
                dod_excerpt=dod_str,
                description=f"Objective specifies '{obj_str}' but DoD validates '{dod_str}'",
                suggestion="Align DoD threshold with objective specification"
            ))

    # Check for contradictions
    objective_lower = wo.objective.lower()
    is_removal = any(indicator in objective_lower for indicator in CONTRADICTION_INDICATORS)

    if is_removal:
        for dod in wo.definition_of_done:
            dod_text = f"{dod.verification} {dod.expected_output}".lower()
            if any(indicator in dod_text for indicator in POSITIVE_INDICATORS):
                excerpt = wo.objective[:50] + "..." if len(wo.objective) > 50 else wo.objective
                issues.append(ConsistencyIssue(
                    wo_id=wo.id,
                    issue_type="contradiction",
                    severity="critical",
                    objective_excerpt=excerpt,
                    dod_excerpt=dod.verification,
                    description="Objective indicates removal but DoD expects positive result",
                    suggestion="Update DoD to verify removal (e.g., expect 404 or error)"
                ))
                break

    # Check for vague thresholds
    for dod in wo.definition_of_done:
        if any(vague in dod.threshold.lower() for vague in VAGUE_THRESHOLD_TERMS):
            excerpt = wo.objective[:50] + "..." if len(wo.objective) > 50 else wo.objective
            issues.append(ConsistencyIssue(
                wo_id=wo.id,
                issue_type="vague_threshold",
                severity="low",
                objective_excerpt=excerpt,
                dod_excerpt=f"threshold: {dod.threshold}",
                description=f"Threshold '{dod.threshold}' is vague and non-quantifiable",
                suggestion="Replace with specific metric (e.g., '< 100ms' instead of 'fast')"
            ))

    return issues


# =============================================================================
# Scoring
# =============================================================================

def calculate_consistency_score(
    total_wos: int,
    inconsistent_wos: int,
    issues: List[ConsistencyIssue]
) -> float:
    """Calculate overall consistency score (0.0 - 1.0)."""
    if total_wos == 0:
        return 1.0

    base_score = (total_wos - inconsistent_wos) / total_wos
    weighted_issue_count = sum(SEVERITY_WEIGHTS[issue.severity] for issue in issues)
    penalty = weighted_issue_count / (total_wos * 10)

    return max(0.0, base_score - penalty)


# =============================================================================
# Main Validation Engine
# =============================================================================

def validate_consistency(
    work_orders: List[WorkOrder],
    fuzzy_threshold: float = 0.6
) -> ConsistencyValidationResult:
    """Validate consistency across all Work Orders."""
    plan_id = work_orders[0].plan_id if work_orders else "PLAN-UNKNOWN"

    all_issues = []
    inconsistent_wo_ids = set()

    for wo in work_orders:
        issues = validate_single_wo_consistency(wo, fuzzy_threshold)
        if issues:
            all_issues.extend(issues)
            inconsistent_wo_ids.add(wo.id)

    consistent_count = len(work_orders) - len(inconsistent_wo_ids)
    overall_score = calculate_consistency_score(len(work_orders), len(inconsistent_wo_ids), all_issues)

    return ConsistencyValidationResult(
        plan_id=plan_id,
        analyzed_at=datetime.now().isoformat(),
        total_work_orders=len(work_orders),
        consistent_work_orders=consistent_count,
        inconsistent_work_orders=len(inconsistent_wo_ids),
        overall_consistency_score=overall_score,
        issues=all_issues
    )


# =============================================================================
# CLI Interface
# =============================================================================

def _load_work_orders(wo_dir: Path, verbose: bool = False) -> List[WorkOrder]:
    """Load Work Orders from YAML files in directory."""
    work_orders = []
    for wo_file in wo_dir.glob("WO-*.yaml"):
        try:
            wo_data_list = safe_load_all(wo_file)
            if wo_data_list and "WorkOrder" in wo_data_list[0]:
                work_orders.append(WorkOrder(**wo_data_list[0]["WorkOrder"]))
        except Exception as e:
            if verbose:
                print(f"Warning: Failed to load {wo_file}: {e}", file=sys.stderr)
    return work_orders


def format_result(result: ConsistencyValidationResult, format_type: str = "text") -> str:
    """Format validation result for output."""
    if format_type == "json":
        return result.model_dump_json(indent=2)
    if format_type == "yaml":
        import yaml
        return yaml.dump(result.model_dump(), default_flow_style=False)

    # Text format
    lines = [
        f"Consistency Validation: {result.plan_id}",
        f"Analyzed {result.total_work_orders} Work Orders",
        f"Overall Score: {result.overall_consistency_score:.1%}",
        f"Consistent: {result.consistent_work_orders}, Inconsistent: {result.inconsistent_work_orders}",
        ""
    ]

    # Group by severity
    for severity, emoji in [("critical", "❌"), ("high", "⚠️"), ("medium", "⚠️"), ("low", "⚠️")]:
        issues = [i for i in result.issues if i.severity == severity]
        if issues:
            lines.append(f"{emoji} {severity.upper()}:")
            for issue in issues:
                lines.append(f"  {issue.wo_id}: {issue.description[:60]}...")
                if severity in ["critical", "high"]:
                    lines.append(f"    Suggestion: {issue.suggestion}")
                lines.append("")

    return "\n".join(lines)


def main() -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Validate consistency between objectives and DoD"
    )
    parser.add_argument("work_orders_dir", type=Path,
                       help="Directory containing Work Order YAML files")
    parser.add_argument("--fuzzy-threshold", type=float, default=0.6,
                       help="Fuzzy matching threshold (default: 0.6)")
    parser.add_argument("--format", choices=["text", "json", "yaml"], default="text",
                       help="Output format (default: text)")
    parser.add_argument("--verbose", action="store_true",
                       help="Enable verbose output")

    args = parser.parse_args()

    if not args.work_orders_dir.exists():
        print(f"Error: Directory not found: {args.work_orders_dir}", file=sys.stderr)
        return 1

    work_orders = _load_work_orders(args.work_orders_dir, args.verbose)
    if not work_orders:
        print("Error: No valid Work Orders found", file=sys.stderr)
        return 1

    result = validate_consistency(work_orders, args.fuzzy_threshold)
    print(format_result(result, args.format))
    return 0


if __name__ == "__main__":
    sys.exit(main())
