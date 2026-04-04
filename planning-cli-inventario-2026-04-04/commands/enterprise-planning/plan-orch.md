---
description: Interactive guide to create executable plans from requirements
argument-hint: [requirement text or file path]
allowed-tools:
  - Read
  - Write
  - Edit
  - AskUserQuestion
  - Bash
  - Skill
---

# /plan-orch

**Interactive planning guide** that transforms ambiguous requirements into executable, validated Work Orders compatible with the `work_O` system.

## What It Does

Guides users through 5 phases interactively:
1. **Requirements Parsing** - Structure vague input into RequirementSet YAML
2. **Strategic Options** - Generate 3-5 alternatives with scoring, user selects
3. **Decomposition** - Build hierarchical plan tree (Vision → WOs)
4. **Work Orders** - Generate executable WOs with Definition of Done
5. **Validation** - Run all checks, create PlanPack

**Key principle:** User confirms at each phase before proceeding.

## Usage

```bash
/plan-orch "Add user authentication with JWT"

/plan-orch --file _ctx/requirements/RQ-2026-0042.yaml

/plan-orch "Build dashboard with charts" --strategy-count 5
```

## Interactive Workflow

### Phase 1: Requirements Parsing

**Goal:** Transform user input into structured `RequirementSet` YAML.

**Steps:**
1. Invoke `requirements-parsing` skill
2. Extract claims (P0/P1/P2), assumptions (confidence+impact), constraints
3. Generate `_ctx/requirements/RQ-YYYY-NNNN.yaml`
4. Present results to user
5. **Ask user to confirm**

**User confirmation dialog:**
```
✅ **Requirements Parsed**

I've identified **X claims**, **Y assumptions**, and **Z constraints**:

**P0 Claims (Critical - must have):**
- C-001: [text]
- C-002: [text]

**Key Assumptions:**
- A-001: [text] (confidence: 0.8, impact: high)

**Constraints:**
- CN-001: [type] - [description]

Review complete file at: _ctx/requirements/RQ-2026-0001.yaml

**Is this correct?** [Y/n]
```

- If `Y` → Proceed to Phase 2
- If `n` → Ask what to add/remove/modify

### Phase 2: Strategic Options

**Goal:** Generate 3-5 strategic alternatives and let user choose.

**Steps:**
1. Invoke `strategic-decomposition` skill
2. Generate 3-5 distinct approaches with trade-offs
3. Score each strategy (constraints, time-to-value, complexity, auditability, adaptability)
4. Present options with scores
5. **Ask user to select strategy**

**User selection dialog:**
```
🎯 **Strategic Options**

I've generated **X strategies** for implementing [requirement summary]:

**STRAT-001: [Name]** (Score: 20/25) ⭐ RECOMMENDED
- Description: [2-3 sentences]
- Strengths: [key advantages]
- Concerns: [key trade-offs]

**STRAT-002: [Name]** (Score: 15/25)
- Description: [2-3 sentences]
- Strengths: [key advantages]
- Concerns: [key trade-offs]

**Scoring Breakdown:**
| Strategy | Constraints | Time-to-Value | Complexity | Auditability | Adaptability | Total |
|----------|-------------|---------------|------------|--------------|--------------|-------|
| STRAT-001 | 5 | 4 | 4 | 4 | 3 | 20 |
| STRAT-002 | 3 | 2 | 2 | 3 | 5 | 15 |

**Which strategy do you prefer?** [1/2/3] or suggest modifications:
```

- User selects number → Proceed to Phase 3
- User suggests modifications → Update strategies and re-present

### Phase 3: Decomposition

**Goal:** Build hierarchical plan tree (Vision → Strategy → Architecture → Work Packages → WOs).

**Steps:**
1. Using selected strategy, build plan tree
2. Decompose into Work Packages (Epics) and Work Orders
3. Generate `plan-tree.yaml`
4. Present tree structure to user
5. **Ask user to review and confirm**

**User review dialog:**
```
✅ **Plan Tree Created**

**Vision:** [Vision title]
- [Objective]

**Strategy:** [Strategy name]
- [Approach description]

**Architecture:** [Pattern]
- Components: [list]

**Work Packages:** [N] packages → [M] work orders total

**E-001: [Epic title]** (3 WOs)
├─ WO-0001: [Task]
├─ WO-0002: [Task]
└─ WO-0003: [Task]

**E-002: [Epic title]** (2 WOs)
├─ WO-0004: [Task]
└─ WO-0005: [Task]

**Full plan tree:** _ctx/plans/PLAN-2026-0001/plan-tree.yaml

**Review the complete tree?** [Y/n]
```

- If `Y` → Show full tree YAML
- After review → **Ask: "Proceed to generate Work Orders?" [Y/n]**

### Phase 4: Work Orders

**Goal:** Generate executable Work Orders with Definition of Done.

**Steps:**
1. Invoke `work-order-generation` skill
2. For each WO in plan tree, create detailed WO-*.yaml with:
   - **Metadata fields (REQUIRED by Pydantic model):**
     - `id`: WO-XXXX (matches plan tree)
     - `created`: ISO 8601 datetime (e.g., "2026-01-15T10:00:00Z")
     - `plan_id`: PLAN-YYYY-NNNN (from plan directory)
     - `work_package`: E-XXX (parent epic, optional)
     - `priority`: P0/P1/P2 (from claim priority)
   - **Core content:**
     - Objective (measurable outcome)
     - DoD with 2+ verification commands
     - Scope boundaries (allow/deny lists)
     - Dependencies (list of WO IDs)
   - **Traceability (CRITICAL):**
     - `claim_links`: List of claim IDs this WO addresses (e.g., [C-001, C-003])
     - MUST link to at least one claim from requirements.yaml
3. Create DoD files (`dods/WO-XXXX-dod.yaml`)
4. Process in batches of 3-5 WOs, present to user
5. **Ask user to review**

**User review dialog:**
```
✅ **Work Orders Generated**

Generated **X Work Orders** from plan tree:

**WO-0001: [Title]** (E-001)
- Plan ID: PLAN-2026-0001
- Claim links: [C-001, C-002]
- Priority: P0
- Objective: [measurable outcome]
- DoD: [N] criteria with verification commands
- Scope: [X] files allowed, [Y] blocked

**WO-0002: [Title]** (E-001)
- Plan ID: PLAN-2026-0001
- Claim links: [C-001]
- Priority: P1
- Objective: [measurable outcome]
- DoD: [N] criteria with verification commands
- Scope: [X] files allowed, [Y] blocked

**Files created:**
- `_ctx/plans/PLAN-2026-0001/work_orders/WO-0001.yaml` through `WO-XXXX.yaml`
- `_ctx/jobs/WO-0001.yaml` through `WO-XXXX.yaml` (for work_O)

**Review sample WO?** [Y/n]
```

- If `Y` → Show full YAML for one WO
- After review → **Ask: "Proceed to final validation?" [Y/n]**

### Phase 5: Validation

**Goal:** Run all validation checks and create PlanPack.

**Steps:**
1. Invoke `plan-validation` skill
2. Run schema validation on all YAML files
3. Check traceability (requirements → strategies → WOs)
4. Verify constraint satisfaction
5. Detect scope conflicts
6. Validate DoD completeness
7. **Code quality review** - Use `/code-review` on WO files
8. **Code simplification** - Use `code-simplifier` agent (optional)
9. Generate `validation-report.yaml`
10. Present results

**Pass dialog:**
```
✅ **Plan Validation: PASS**

**PLAN-2026-0001 is valid and ready for execution.**

**All checks passed:**
- ✅ Schema validation
- ✅ Traceability
- ✅ Constraints
- ✅ DoD completeness
- ✅ Scope conflicts
- ✅ Code quality review
- ✅ Code simplification

**PlanPack created:** _ctx/plans/PLAN-2026-0001/
├── requirements.yaml
├── strategies/strategy-evaluation.yaml
├── plan-tree.yaml
├── work_orders/
│   ├── WO-0001.yaml
│   └── ...
├── dods/
│   ├── WO-0001-dod.yaml
│   └── ...
└── validation-report.yaml

**Ready to proceed with work_O execution.**
```

**Fail dialog:**
```
❌ **Plan Validation: FAIL**

**PLAN-2026-0001 has [N] critical issues that must be fixed:**

**Critical Errors:**
1. **Schema validation failed**
   - WO-0003.yaml missing required field: objective
   - File: _ctx/jobs/WO-0003.yaml:5

2. **Circular dependency detected**
   - WO-0001 → WO-0002 → WO-0001
   - Break the cycle to proceed

**Fix critical errors and re-run validation with:**
```bash
/plan-validate PLAN-2026-0001
```
```

## Arguments

**Positional:**
- `requirement` - Requirement text or file path (`--file`)

**Optional:**
- `--file PATH` - Read requirement from YAML file instead of text
- `--strategy-count N` - Generate N strategies (default: 3)
- `--validate-strict` - Treat warnings as errors during validation
- `--constraints PATH` - Load additional constraints from file

## Examples

### Simple requirement
```bash
/plan-orch "Add user authentication with JWT"
```

### From requirement file
```bash
/plan-orch --file _ctx/requirements/RQ-2026-0042.yaml
```

### Custom strategy count
```bash
/plan-orch "Build dashboard" --strategy-count 5
```

### With custom constraints
```bash
/plan-orch "Add payment processing" --constraints _ctx/constraints/project-constraints.yaml
```

## Output Location

**Plans created at:** `_ctx/plans/PLAN-YYYY-NNNN/`

**Directory structure:**
```
_ctx/plans/PLAN-2026-0001/
├── requirements.yaml           # Parsed RequirementSet
├── strategies/
│   └── strategy-evaluation.yaml # Generated strategies with scores
├── plan-tree.yaml              # Hierarchical decomposition
├── work_orders/
│   ├── WO-0001.yaml           # Generated Work Orders
│   └── ...
├── dods/
│   ├── WO-0001-dod.yaml       # Definition of Done files
│   └── ...
└── validation-report.yaml      # Validation results
```

## Integration with work_O

This plugin generates Work Orders compatible with the `work_O` system:
- Repository: https://github.com/fegome90-cmd/work_O
- Work Orders are created as `_ctx/jobs/WO-*.yaml`
- The work_O backend will consume these YAML files for execution

## Progress Tracking

**Each phase:**
- Explains what's happening
- Generates output
- **Asks user to confirm**
- Only proceeds if user agrees

**Current phase indicator:**
```
🎯 **Phase 1: Requirements Parsing**
🎯 **Phase 2: Strategic Options**
🎯 **Phase 3: Decomposition**
🎯 **Phase 4: Work Orders**
🎯 **Phase 5: Validation**
```

## Error Handling

**If user cancels at any phase:**
- Save what's been generated so far
- Show user what was created
- Allow resuming with `/plan-orch` (detect partial plan)

**If validation fails:**
- Show specific errors
- Guide user to fix issues
- Re-validate with `/plan-validate PLAN-ID`

## Related Commands

- `/plan-validate PLAN-ID` - Re-validate existing plan after manual edits
- `/wo-generate E-XXX` - Generate additional WOs for existing epic
- `/strategy-evaluate --plan PLAN-ID --weight-time-to-value 2.0` - Re-evaluate with custom weights
- `/replan WO-XXXX --reason "..."` - Trigger adaptive replanning when WO fails

## Skills Used

This command orchestrates the following skills:
1. `requirements-parsing` - Phase 1
2. `strategic-decomposition` - Phase 2
3. `work-order-generation` - Phase 4
4. `plan-validation` - Phase 5

Skills are invoked progressively - only the current phase's skill is loaded.
