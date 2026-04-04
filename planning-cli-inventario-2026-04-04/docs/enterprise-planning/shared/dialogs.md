# Standard User Dialogs Reference

> This file contains standard user interaction dialogs used across the enterprise-planning plugin. Commands and agents should reference these dialogs instead of duplicating them.

## Usage

Instead of including full dialog text in command/agent files, reference:

```markdown
**User confirmation dialog:**
[See: dialogs.md#RequirementsConfirmation]

Use AskUserQuestion with:
- question: "Is this correct?"
- options: ["Yes, proceed", "No, modify"]
```

---

## Phase 1: Requirements Parsing

### RequirementsConfirmation

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

**Is this correct?**
```

**AskUserQuestion format:**
- Options: "Yes, proceed to Phase 2", "No, modify requirements"

---

## Phase 2: Strategic Options

### StrategySelection

```
✅ **Strategic Alternatives Generated**

I've evaluated **N** strategic approaches:

**STRAT-001: [Name]** (Score: 4.2/5.0)
- Constraint Satisfaction: 5/5
- Time-to-Value: 4/5
- Complexity: 3/5
- **Summary:** [1-2 sentence summary]

**STRAT-002: [Name]** (Score: 3.8/5.0)
- Constraint Satisfaction: 4/5
- Time-to-Value: 3/5
- Complexity: 4/5
- **Summary:** [1-2 sentence summary]

**Which strategy should we use?**
```

**AskUserQuestion format:**
- Options: Each strategy as selectable option

---

## Phase 3: Plan Tree Decomposition

### PlanTreeReview

```
✅ **Plan Tree Created**

Hierarchical decomposition complete:

**Vision:** [Project vision]

**Strategy:** STRAT-001 [Strategy name]

**Architecture:** [Architecture approach]

**Work Packages (Epics): 4**
- E-001: [Epic name] (3 WOs)
- E-002: [Epic name] (2 WOs)
- E-003: [Epic name] (4 WOs)
- E-004: [Epic name] (2 WOs)

**Total Work Orders:** 11

**Does this decomposition look right?**
```

**AskUserQuestion format:**
- Options: "Yes, generate WOs", "No, adjust decomposition"

---

## Phase 4: Work Order Generation

### WorkOrderGenerationConfirmation

```
✅ **Work Orders Generated**

Created **N** Work Order files:

**WO-0001:** [Title]
- Objective: [measurable outcome]
- DoD: 3 verification commands
- Scope: 4 allow paths, 1 deny path

**WO-0002:** [Title]
- Objective: [measurable outcome]
- DoD: 2 verification commands
- Scope: 3 allow paths, 0 deny paths

[... remaining WOs ...]

**Output location:** _ctx/plans/PLAN-2026-0001/work_orders/

**Ready to validate?**
```

**AskUserQuestion format:**
- Options: "Yes, validate plan", "No, review WOs first"

---

## Phase 5: Plan Validation

### ValidationResults

**If PASS:**
```
✅ **Plan Validation: PASS**

**PLAN-2026-0001 is valid and ready for execution.**

**Validation Summary:**
- Schema validation: ✅ PASS
- Traceability: ✅ PASS (all claims addressed)
- Constraints: ✅ PASS (all hard constraints satisfied)
- DoD completeness: ✅ PASS (all WOs have 2+ verification commands)
- Scope conflicts: ✅ PASS (no conflicts detected)

**PlanPack created at:** _ctx/plans/PLAN-2026-0001/

**Next step:** Execute WOs with work_O system
```

**If FAIL:**
```
❌ **Plan Validation: FAIL**

**PLAN-2026-0001 has [N] critical issues:**

**Critical Errors:**
1. Schema validation failed
   - WO-0003.yaml missing required field: objective
   - File: _ctx/jobs/WO-0003.yaml:5

2. Circular dependency detected
   - WO-0001 → WO-0002 → WO-0001

**Action:** Fix issues above, then run: /plan-validate PLAN-2026-0001
```

**AskUserQuestion format:**
- Options: "View full validation report", "Fix issues manually", "Continue despite warnings"

---

## Error Dialogs

### PhaseError

```
❌ **Error in Phase [N]**

[Specific error message]

**What happened:** [Explanation]

**Recovery options:**
- Resume from this phase with /plan-orch --resume
- Rollback to previous phase with /plan-undo PLAN-ID --phase N-1
- View error logs at _ctx/logs/plan-orch-error.log
```

---

## Notes

- All dialogs use ✅ for success, ❌ for errors, ⚠️ for warnings
- Structured data (counts, IDs) should be bolded
- File paths should use code formatting
- Always provide clear next steps or action items
- Use AskUserQuestion for interactive confirmations
