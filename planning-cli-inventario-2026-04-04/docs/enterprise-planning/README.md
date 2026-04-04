# Enterprise Planning Plugin

Interactive guide to transform ambiguous requirements into executable, validated Work Orders compatible with the `work_O` system.

## 🎯 Status: PRODUCTION READY

- ✅ **45/45 tests passing** (100% coverage)
- ✅ **Pydantic v2** type-safe models
- ✅ **Fail-closed validation**
- ✅ **CLI integration** with exit codes

---

## Overview

This plugin provides an interactive planning workflow that guides you through:
1. **Requirements Parsing** - Structure vague requirements into RequirementSets
2. **Strategic Decomposition** - Generate and evaluate strategic alternatives
3. **Work Order Generation** - Create executable WOs with Definition of Done
4. **Plan Validation** - Fail-closed validation of complete plans

---

## Quick Start

```bash
# Start interactive planning
/plan-orch "Add user authentication with JWT"

# The plugin will guide you through each phase:
# Phase 1: Parse requirements → RequirementSet YAML
# Phase 2: Generate strategies → StrategyEvaluation YAML
# Phase 3: Decompose into plan tree → PlanTree YAML
# Phase 4: Generate work orders → WorkOrder YAMLs
# Phase 5: Validate and create PlanPack → ValidationResult
```

---

## Output

Plans are generated as validated YAML files in `_ctx/plans/PLAN-YYYY-NNNN/`:

```
_ctx/plans/PLAN-2026-0001/
├── requirements.yaml       # RequirementSet (validated)
├── strategies/
│   └── strategy-evaluation.yaml
├── plan-tree.yaml          # PlanTree (validated)
├── work_orders/            # WorkOrders (validated)
│   ├── WO-0001.yaml
│   ├── WO-0002.yaml
│   └── ...
└── dods/                   # Definition of Done
    ├── WO-0001-dod.yaml
    ├── WO-0002-dod.yaml
    └── ...
```

---

## Architecture

**Dual-pathway design:**
- **Explicit:** Run `/plan-orch` to start interactive planning
- **Implicit:** Claude detects planning needs and invokes `planner-guide` agent

**Progressive disclosure:** Skills load only when needed for current phase.

**Fail-closed validation:** All YAML files validated on write via hooks.

---

## Components

### Skills (4) ✅
- `requirements-parsing` - Parse requirements → RequirementSet YAML
- `strategic-decomposition` - Generate 3-5 strategic alternatives
- `work-order-generation` - Generate WOs with DoD
- `plan-validation` - Fail-closed validation

### Command (1) ✅
- `/plan-orch` - Interactive planning guide

### Agent (1) ✅
- `planner-guide` - Orchestrates workflow

### Validation Scripts (4) ✅
- `scripts/lib/types.py` - Pydantic models (~283 lines)
- `scripts/lib/yaml_utils.py` - YAML utilities (~373 lines)
- `scripts/lib/plan_validator.py` - Schema validation (~420 lines)
- `scripts/lib/traceability.py` - Traceability checking (~146 lines)

### Hooks (1) ✅
- PostToolWrite auto-validation (fail-closed)

### Tests (45) ✅
- `tests/test_yaml_utils.py` - 21 tests
- `tests/test_plan_validator.py` - 17 tests
- `tests/test_traceability.py` - 7 tests

---

## Type Safety with Pydantic v2

All YAML structures validated with Pydantic models:

```python
# Automatic validation on load
req_set = safe_load_and_validate(
    Path("requirements.yaml"),
    RequirementSet
)
# Raises ValidationError if:
# - Required fields missing
# - Pattern mismatch (e.g., "C-1" instead of "C-001")
# - Priority not P0/P1/P2
# - Confidence out of 0.0-1.0 range
```

**Models implemented:**
- `Claim`, `Assumption`, `Constraint`, `RequirementSet`
- `WorkOrder`, `DoDEntry`, `ScopeEntry`
- `PlanTree`, `WorkPackage`, `WorkOrderReference`
- `ValidationResult`, `TraceabilityResult`, `ExitCode`

**Validation features:**
- Pattern matching (e.g., `^C-\d+$` for claim IDs)
- Range validation (confidence 0.0-1.0)
- Enum validation (Priority P0-P2, Impact levels)
- Required fields with `min_length`
- Custom validators (vague threshold detection)

---

## CLI Integration

### Validate Single Files
```bash
python -m scripts.lib.plan_validator requirements.yaml --schema requirement-set
python -m scripts.lib.plan_validator work-order.yaml --schema work-order
python -m scripts.lib.plan_validator plan-tree.yaml --schema plan-tree
```

### Validate Complete Plans
```bash
python -m scripts.lib.plan_validator PLAN-2026-0001/
python -m scripts.lib.traceability PLAN-2026-0001/
```

### Exit Codes
- `0` = SUCCESS (validation passed)
- `1` = SCHEMA_ERROR (Pydantic validation failed)
- `2` = TRACEABILITY_ERROR (orphaned claims, circular deps, missing files)
- `3` = CONSTRAINT_ERROR (hard constraint not satisfied)
- `4` = SCOPE_CONFLICT (overlapping allow/deny lists)

---

## Testing

### Run Tests
```bash
# All tests
pytest tests/ -v

# Specific module
pytest tests/test_yaml_utils.py -v
pytest tests/test_plan_validator.py -v
pytest tests/test_traceability.py -v

# With coverage
pytest tests/ --cov=scripts.lib --cov-report=html
```

### Test Results
```
========================= 45 passed in 0.17s =========================

tests/test_yaml_utils.py ................. 21 passed
tests/test_plan_validator.py ................ 17 passed
tests/test_traceability.py ....... 7 passed
```

---

## Integration with work_O

This plugin generates Work Orders compatible with the `work_O` system:
- https://github.com/fegome90-cmd/work_O

The work_O backend will consume these YAML files for execution.

---

## Installation

**Location:** `/Users/felipe_gonzalez/.claude/plugins/marketplaces/local/plugins/enterprise-planning/`
**Version:** 0.2.0
**Status:** Production Ready

### Install via Claude Code

```bash
# The plugin is registered in the local marketplace
/plugin install enterprise-planning@local
```

### Verify Installation

```bash
# List installed plugins
/plugin list

# Test the command
/plan-orch "Add user authentication"
```

### Dependencies (Optional)

**Phase 5 Validation can optionally use these official Claude Code tools:**

| Tool | Purpose | Installed With |
|------|---------|-----------------|
| `/code-review` | Code quality validation | pr-review-toolkit plugin |
| `code-simplifier` | Code simplification | pr-review-toolkit plugin |

**How integration works:**
- The plugin documents when to use these tools in Phase 5
- Claude Code will invoke them via the `Skill` tool when needed
- If not installed, validation continues without them (warning logged)

**To enable full validation:**
```bash
# Install pr-review-toolkit (contains both tools)
/plugin install pr-review-toolkit@claude-plugins-official
```

**Note:** These are **optional enhancements**. Core validation (schema, traceability) works without them.

See [INSTALLATION_STATUS.md](INSTALLATION_STATUS.md) for complete details.

---

## License

MIT
