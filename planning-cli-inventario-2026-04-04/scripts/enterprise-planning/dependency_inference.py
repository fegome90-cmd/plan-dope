"""
Dependency Inference Module for Work Orders.

Auto-detects dependencies between Work Orders by analyzing:
1. File creation → modification patterns (with wildcard expansion)
2. Import statements in DoD commands
3. API endpoint dependencies (curl commands)

Usage:
    python -m scripts.lib.dependency_inference <work_orders_dir> [options]
"""

import argparse
import re
import sys
from datetime import datetime
from fnmatch import fnmatch
from pathlib import Path
from typing import List, Optional, Tuple

from scripts.lib.types import (
    WorkOrder,
    DependencySuggestion,
    DependencyInferenceResult,
)
from scripts.lib.yaml_utils import safe_load_all


# =============================================================================
# Wildcard Expansion
# =============================================================================

def expand_wildcards(patterns: List[str], base_dir: Path) -> List[str]:
    """
    Expand glob wildcards to concrete file paths.

    Examples:
      ["src/auth/**/*"] → ["src/auth/login.py", "src/auth/models.py", ...]
      ["src/**/*.py"] → All .py files under src/
      ["src/auth/models.py"] → ["src/auth/models.py"] (no expansion)

    Args:
        patterns: List of file patterns (may contain wildcards)
        base_dir: Base directory for glob expansion

    Returns:
        List of expanded file paths (unique, sorted, relative to base_dir)
    """
    expanded = set()
    for pattern in patterns:
        try:
            matches = {
                str(p.relative_to(base_dir))
                for p in base_dir.glob(pattern)
                if p.is_file()
            }
            expanded.update(matches)
        except ValueError:
            continue  # Path not relative to base_dir

    # If no wildcards and no matches, keep original pattern
    if not expanded and all(not any(c in p for c in '*?[') for p in patterns):
        return sorted(patterns)

    return sorted(expanded)


# =============================================================================
# Create → Modify Detection
# =============================================================================

def calculate_confidence(source_files: List[str], target_files: List[str]) -> float:
    """
    Calculate confidence score for create→modify dependency.

    Confidence levels:
    - 0.95: Exact file match (src/auth/models.py in both)
    - 0.85: Parent/child directory relationship
    - 0.70: Same module directory
    - 0.50: Wildcard overlap (manual review recommended)
    - 0.00: No overlap

    Args:
        source_files: Files created by target WO
        target_files: Files modified by source WO

    Returns:
        Confidence score 0.0-1.0
    """
    if not source_files or not target_files:
        return 0.0

    source_set, target_set = set(source_files), set(target_files)

    # Exact match
    if source_set & target_set:
        return 0.95

    # Normalize paths for cross-platform compatibility
    normalize = lambda p: p.replace('\\', '/')

    # Parent/child relationship
    for src in source_files:
        for tgt in target_files:
            src_norm, tgt_norm = normalize(src), normalize(tgt)
            if tgt_norm.startswith(src_norm + '/') or src_norm.startswith(tgt_norm + '/'):
                return 0.85

    # Same module directory
    src_dirs = {str(Path(f).parent) for f in source_files}
    tgt_dirs = {str(Path(f).parent) for f in target_files}
    if src_dirs & tgt_dirs:
        return 0.70

    # Wildcard overlap
    return 0.50 if any(fnmatch(s, t) or fnmatch(t, s) for s in source_files for t in target_files) else 0.0


def detect_create_modify_pattern(
    source_wo: WorkOrder,
    target_wo: WorkOrder,
    base_dir: Path
) -> Optional[DependencySuggestion]:
    """
    Detect if source_wo modifies files created by target_wo.

    Process:
    1. Expand wildcards in both scope.allow lists
    2. Check for overlaps using fnmatch
    3. Calculate confidence based on overlap specificity

    Args:
        source_wo: WO that may have a dependency
        target_wo: WO that may be depended upon
        base_dir: Base directory for glob expansion

    Returns:
        DependencySuggestion if pattern detected, None otherwise
    """
    if source_wo.id == target_wo.id:
        return None

    source_files = expand_wildcards(source_wo.scope.allow, base_dir)
    target_files = expand_wildcards(target_wo.scope.allow, base_dir)

    confidence = calculate_confidence(source_files, target_files)

    if confidence < 0.5:
        return None

    # Build evidence
    evidence = []
    exact_matches = set(source_files) & set(target_files)
    if exact_matches:
        evidence.append(f"Exact file overlap: {', '.join(exact_matches)}")
    else:
        # Find parent/child relationships (limit to 3 examples)
        for src in source_files[:3]:
            for tgt in target_files[:3]:
                if tgt.startswith(src + '/') or src.startswith(tgt + '/'):
                    evidence.append(f"Directory relationship: {tgt} depends on {src}")
                    break

    return DependencySuggestion(
        source_wo=source_wo.id,
        depends_on=target_wo.id,
        confidence=confidence,
        reason=f"create→modify pattern detected (confidence: {confidence:.2f})",
        evidence=evidence,
        suggestion_type="create_modify"
    )


# =============================================================================
# Import Usage Detection
# =============================================================================

IMPORT_PATTERNS = [
    re.compile(r'from\s+([a-zA-Z0-9_.]+)\s+import(?:\s+\w+(?:\s*,\s*\w+)*)?(?:\s+as\s+\w+)?'),
    re.compile(r'import\s+([a-zA-Z0-9_.]+)(?:\s+as\s+\w+)?'),
    re.compile(r'--cov=([a-zA-Z0-9_.]+)'),
]


def extract_imports_from_commands(commands: List[str]) -> List[str]:
    """Extract imported modules from DoD commands."""
    imports = set()
    for cmd in commands:
        for pattern in IMPORT_PATTERNS:
            imports.update(pattern.findall(cmd))
    return list(imports)


def _matches_import_path(imp_path: str, target_file: str) -> bool:
    """Check if import path matches target file."""
    target_no_ext = target_file.removesuffix('.py')

    if imp_path == target_no_ext:
        return True

    # Parent module match: src.auth matches src/auth/models
    imp_parts = imp_path.split('/')
    target_parts = target_no_ext.split('/')

    return len(imp_parts) <= len(target_parts) and imp_parts == target_parts[:len(imp_parts)]


def detect_import_usage(
    source_wo: WorkOrder,
    all_wos: List[WorkOrder],
    base_dir: Path
) -> List[DependencySuggestion]:
    """Detect dependencies by analyzing imports in DoD commands."""
    dod_commands = [dod.command for dod in source_wo.definition_of_done]
    imports = extract_imports_from_commands(dod_commands)

    if not imports:
        return []

    suggestions = []
    for target_wo in all_wos:
        if target_wo.id == source_wo.id:
            continue

        target_files = expand_wildcards(target_wo.scope.allow, base_dir)

        for imp in imports:
            imp_path = imp.replace('.', '/')

            for target_file in target_files:
                if _matches_import_path(imp_path, target_file):
                    suggestions.append(DependencySuggestion(
                        source_wo=source_wo.id,
                        depends_on=target_wo.id,
                        confidence=0.95,
                        reason=f"Import '{imp}' found in DoD commands matches {target_wo.id} scope",
                        evidence=[f"Import: {imp}", f"Target file: {target_file}"],
                        suggestion_type="import_usage"
                    ))
                    break  # One match per target WO

    return suggestions


# =============================================================================
# API Endpoint Detection
# =============================================================================

CURL_PATTERN = re.compile(r'curl\s+(?:.*?\s)?(https?://[^\s]+|/[^\s]+)')
CURL_METHOD_PATTERN = re.compile(r'(?:-X|--request)\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)', re.IGNORECASE)


def extract_api_endpoints(commands: List[str]) -> List[Tuple[str, str]]:
    """Extract API endpoints from curl commands."""
    endpoints = []
    for cmd in commands:
        if 'curl' not in cmd.lower():
            continue

        match = CURL_PATTERN.search(cmd)
        if not match:
            continue

        url = match.group(1)
        method_match = CURL_METHOD_PATTERN.search(cmd)
        method = method_match.group(1).upper() if method_match else 'GET'

        # Extract path from URL
        if url.startswith('http'):
            parts = url.split('/', 3)
            path = '/' + parts[-1] if len(parts) > 3 else '/'
        else:
            path = url

        # Remove query string
        path = path.split('?')[0]
        endpoints.append((method, path))

    return endpoints


def detect_api_dependencies(
    source_wo: WorkOrder,
    target_wo: WorkOrder
) -> Optional[DependencySuggestion]:
    """Detect if source_wo tests API endpoint from target_wo."""
    if source_wo.id == target_wo.id:
        return None

    source_commands = [dod.command for dod in source_wo.definition_of_done]
    target_commands = [dod.command for dod in target_wo.definition_of_done]

    source_endpoints = extract_api_endpoints(source_commands)
    target_endpoints = extract_api_endpoints(target_commands)

    for src_method, src_path in source_endpoints:
        for tgt_method, tgt_path in target_endpoints:
            # Check if source endpoint depends on target (e.g., /refresh requires /login)
            tgt_parent = tgt_path.rsplit('/', 1)[0] + '/' if '/' in tgt_path else '/'
            if src_path != tgt_path and src_path.startswith(tgt_parent):
                if 'auth' in src_path.lower() or 'login' in tgt_path.lower():
                    return DependencySuggestion(
                        source_wo=source_wo.id,
                        depends_on=target_wo.id,
                        confidence=0.90,
                        reason=f"API endpoint '{src_path}' likely requires '{tgt_path}'",
                        evidence=[
                            f"Source endpoint: {src_method} {src_path}",
                            f"Target endpoint: {tgt_method} {tgt_path}"
                        ],
                        suggestion_type="api_endpoint"
                    )

    return None


# =============================================================================
# Main Inference Engine
# =============================================================================

def infer_dependencies(
    work_orders: List[WorkOrder],
    base_dir: Path
) -> DependencyInferenceResult:
    """Infer dependencies between Work Orders using all detection methods."""
    plan_id = work_orders[0].plan_id if work_orders else "PLAN-UNKNOWN"
    suggestions = []

    # 1. Create → Modify Detection
    for source_wo in work_orders:
        for target_wo in work_orders:
            if suggestion := detect_create_modify_pattern(source_wo, target_wo, base_dir):
                suggestions.append(suggestion)

    # 2. Import Usage Detection
    for source_wo in work_orders:
        suggestions.extend(detect_import_usage(source_wo, work_orders, base_dir))

    # 3. API Endpoint Detection
    for source_wo in work_orders:
        for target_wo in work_orders:
            if suggestion := detect_api_dependencies(source_wo, target_wo):
                suggestions.append(suggestion)

    # Deduplicate, keeping highest confidence per pair
    suggestion_map: dict[tuple[str, str], DependencySuggestion] = {}
    for s in suggestions:
        key = (s.source_wo, s.depends_on)
        if key not in suggestion_map or s.confidence > suggestion_map[key].confidence:
            suggestion_map[key] = s

    unique_suggestions = list(suggestion_map.values())

    # Count by confidence level
    high_count = sum(1 for s in unique_suggestions if s.confidence >= 0.8)
    medium_count = sum(1 for s in unique_suggestions if 0.5 <= s.confidence < 0.8)
    low_count = len(unique_suggestions) - high_count - medium_count

    return DependencyInferenceResult(
        plan_id=plan_id,
        analyzed_at=datetime.now().isoformat(),
        total_work_orders=len(work_orders),
        suggestions=unique_suggestions,
        high_confidence_count=high_count,
        medium_confidence_count=medium_count,
        low_confidence_count=low_count
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


def format_result(result: DependencyInferenceResult, format_type: str = "text") -> str:
    """Format inference result for output."""
    if format_type == "json":
        return result.model_dump_json(indent=2)
    if format_type == "yaml":
        import yaml
        return yaml.dump(result.model_dump(), default_flow_style=False)

    # Text format
    lines = [
        f"Dependency Inference: {result.plan_id}",
        f"Analyzed {result.total_work_orders} Work Orders",
        f"Found {len(result.suggestions)} suggestions",
        ""
    ]

    # Group by confidence
    high = [s for s in result.suggestions if s.confidence >= 0.8]
    medium = [s for s in result.suggestions if 0.5 <= s.confidence < 0.8]
    low = [s for s in result.suggestions if s.confidence < 0.5]

    if high:
        lines.append("⚠️  HIGH CONFIDENCE (>= 0.8):")
        for s in high:
            lines.append(f"  {s.source_wo} → {s.depends_on} (confidence: {s.confidence:.2f})")
            lines.append(f"    Reason: {s.reason}")
            for e in s.evidence[:2]:
                lines.append(f"      - {e}")
            lines.append("")

    if medium:
        lines.append("⚠️  MEDIUM CONFIDENCE (0.5-0.8):")
        for s in medium:
            lines.append(f"  {s.source_wo} → {s.depends_on} (confidence: {s.confidence:.2f})")
            lines.append(f"    Reason: {s.reason}")
            lines.append("")

    if low:
        lines.append("⚠️  LOW CONFIDENCE (< 0.5) - Manual review recommended:")
        for s in low:
            lines.append(f"  {s.source_wo} → {s.depends_on} (confidence: {s.confidence:.2f})")
            lines.append("")

    return "\n".join(lines)


def main() -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Infer dependencies between Work Orders"
    )
    parser.add_argument("work_orders_dir", type=Path,
                       help="Directory containing Work Order YAML files")
    parser.add_argument("--confidence-threshold", type=float, default=0.5,
                       help="Minimum confidence threshold for reporting (default: 0.5)")
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

    result = infer_dependencies(work_orders, args.work_orders_dir)

    # Filter by confidence threshold
    result.suggestions = [s for s in result.suggestions if s.confidence >= args.confidence_threshold]

    print(format_result(result, args.format))
    return 0


if __name__ == "__main__":
    sys.exit(main())
