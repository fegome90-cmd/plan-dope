#!/usr/bin/env python3
"""
Traceability Checker for Enterprise Planning Plugin

Checks traceability chains:
- Requirements → Work Orders (claims addressed)
- Work Orders → Files (all WOs have files)
- Dependencies (circular detection)

Usage:
    python -m scripts.lib.traceability <plan_directory>

Exit codes:
    0 = SUCCESS (traceability pass)
    1 = SCHEMA_ERROR
    2 = TRACEABILITY_ERROR
"""

import sys
import argparse
from pathlib import Path
from typing import List

from scripts.lib.types import ExitCode
from scripts.lib import plan_validator


def check_traceability(plan_dir: Path, verbose: bool = False) -> List[str]:
    """
    Check all traceability chains in a plan.

    Args:
        plan_dir: Path to plan directory
        verbose: Whether to show detailed errors

    Returns:
        List of error messages (empty if pass)
    """
    errors = []

    # Check required files exist
    requirements_file = plan_dir / "requirements.yaml"
    plan_tree_file = plan_dir / "plan-tree.yaml"
    work_orders_dir = plan_dir / "work_orders"

    if not requirements_file.exists():
        return ["Missing required file: requirements.yaml"]

    if not plan_tree_file.exists():
        return ["Missing required file: plan-tree.yaml"]

    if not work_orders_dir.exists():
        return ["Missing required directory: work_orders/"]

    # Validate plan tree and get result
    try:
        result = plan_validator.validate_all(plan_dir)

        if not result.passed:
            # Build error list from validation result
            if not result.schema_validation:
                errors.append("Schema validation failed")

            # Check orphaned claims
            if not result.traceability.all_claims_addressed:
                for claim_id in result.traceability.orphaned_claims:
                    errors.append(f"Orphaned claim: {claim_id} (not linked to any WorkOrder)")

            # Check circular dependencies
            if not result.traceability.no_circular_dependencies:
                errors.append("Circular dependency detected in work orders")
                for chain in result.traceability.circular_dependency_chains:
                    errors.append(f"  Chain: {' → '.join(chain)}")

            # Check missing WO files
            if not result.traceability.all_wos_have_files:
                for wo_id in result.traceability.missing_wo_files:
                    errors.append(f"Missing WorkOrder file: {wo_id}.yaml")

    except Exception as e:
        errors.append(f"Error during validation: {e}")

    return errors


def check_traceability_with_exit_code(plan_dir: Path) -> ExitCode:
    """
    Check traceability and return exit code.

    Args:
        plan_dir: Path to plan directory

    Returns:
        Exit code (0 = success, 2 = traceability error, 1 = schema error)
    """
    errors = check_traceability(plan_dir)

    if errors:
        # Check if this is a traceability error vs schema error
        if any("Orphaned claim" in e or "Circular dependency" in e for e in errors):
            return ExitCode.TRACEABILITY_ERROR
        return ExitCode.SCHEMA_ERROR

    return ExitCode.SUCCESS


# =============================================================================
# CLI Entry Point
# =============================================================================

def main():
    """CLI for traceability checker."""
    parser = argparse.ArgumentParser(
        description="Check traceability in planning artifacts"
    )
    parser.add_argument("plan_dir", type=Path, help="Plan directory (e.g., PLAN-2026-0001)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed errors")

    args = parser.parse_args()

    # Check directory exists
    if not args.plan_dir.exists():
        print(f"Error: Directory not found: {args.plan_dir}", file=sys.stderr)
        sys.exit(2)

    if not args.plan_dir.is_dir():
        print(f"Error: Not a directory: {args.plan_dir}", file=sys.stderr)
        sys.exit(2)

    # Run traceability checks
    errors = check_traceability(args.plan_dir, args.verbose)

    # Report results
    if errors:
        print(f"Traceability FAIL: {args.plan_dir}", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)
    else:
        print(f"Traceability PASS: {args.plan_dir}")
        sys.exit(0)


if __name__ == "__main__":
    main()
