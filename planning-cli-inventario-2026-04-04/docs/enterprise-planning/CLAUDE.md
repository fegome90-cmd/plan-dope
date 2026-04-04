# Enterprise Planning Plugin

## Project Context

**Business Domain:** Claude Code Plugin for Enterprise Requirements Planning

**User Role:** Claude Code AI assistant acting as an enterprise planning orchestrator

**Key Concepts:** Work Orders, YAML validation, 5-phase workflow (Requirements → Strategy → Plan Tree → Work Orders → Validation), traceability, fail-closed schema validation

---

Claude Code plugin: Transform ambiguous requirements → validated Work Orders.

**Status:** v0.2.0, Production Ready (45/45 tests passing)

## Workflow

```
/plan-orch "user authentication with JWT"
  ↓ Phase 1: Requirements Parsing → requirements.yaml
  ↓ Phase 2: Strategic Decomposition → strategy-evaluation.yaml
  ↓ Phase 3: Plan Tree → plan-tree.yaml
  ↓ Phase 4: Work Orders → WO-*.yaml
  ↓ Phase 5: Validation → validation-report.yaml
```

**Output:** `_ctx/plans/PLAN-YYYY-NNNN/` with all validated YAML files.

## Development

### Test
```bash
pytest tests/ -v
```

### Validate YAMLs
```bash
# Single file
python -m scripts.lib.plan_validator file.yaml --schema work-order

# Complete plan
python -m scripts.lib.plan_validator _ctx/plans/PLAN-2026-0001/
python -m scripts.lib.traceability _ctx/plans/PLAN-2026-0001/
```

## Architecture

**Type-safe models:** `scripts/lib/types.py` (Pydantic v2)
**Validation utilities:** `scripts/lib/yaml_utils.py`
**Schema validator:** `scripts/lib/plan_validator.py`
**Traceability:** `scripts/lib/traceability.py`

**Directory structure dependencies:**
- `scripts/lib/` provides shared models and utilities for all workflow phases
- Skills communicate with `scripts/lib/types.py` for schema validation

**Skills:** `skills/*/SKILL.md` (4 phases)
**Commands:** `commands/*.md` (1: `/plan-orch`)
**Hooks:** `hooks/hooks.json` (fail-closed validation on write)

**Component Directory Structure Relationships:**
- `commands/plan-orch.md` communicates with `skills/*/SKILL.md` via 5-phase workflow orchestration
- `skills/requirements/SKILL.md` depends on `scripts/lib/types.py` for Requirements model validation
- `skills/strategy/SKILL.md` depends on `scripts/lib/types.py` for StrategyEvaluation model
- `skills/plan-tree/SKILL.md` depends on `scripts/lib/types.py` for PlanTree model
- `skills/work-orders/SKILL.md` depends on `scripts/lib/types.py` for WorkOrder model generation
- `scripts/lib/yaml_utils.py` communicates with `scripts/lib/types.py` for YAML serialization/deserialization
- `scripts/lib/plan_validator.py` depends on `scripts/lib/types.py` for schema validation (Pydantic v2)
- `scripts/lib/traceability.py` communicates with all plan YAMLs for dependency tracking and validation
- `hooks/hooks.json` depends on `scripts/lib/plan_validator.py` for fail-closed validation on file write
- `tests/` depends on all modules via pytest (45 tests covering validation and traceability)

**Architecture Notes:**
- 5-phase workflow produces sequential YAML outputs with strict schema validation
- Pydantic v2 provides fail-closed validation (invalid files rejected at type level)
- Traceability system ensures all Work Orders trace back to original requirements
- Exit codes (0-4) provide specific failure feedback (SCHEMA_ERROR, TRACEABILITY_ERROR, etc.)
- Optional integration with work_O system for Work Order execution

## Exit Codes

- `0` = SUCCESS
- `1` = SCHEMA_ERROR
- `2` = TRACEABILITY_ERROR
- `3` = CONSTRAINT_ERROR
- `4` = SCOPE_CONFLICT

## Integration

**work_O system:** https://github.com/fegome90-cmd/work_O

**Optional tools** (Phase 5):
- `/code-review` (pr-review-toolkit)
- `code-simplifier` (pr-review-toolkit)

## References

- README.md - Full user documentation
- docs/plans/ - Roadmap and plans
- INSTALLATION_STATUS.md - Dependencies
