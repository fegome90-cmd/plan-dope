# Enterprise Planning Plugin - Token Optimization v0.2.0

## Overview

**Context:** The plugin (v0.1.1) is fully functional but consumes ~25,000-35,000 tokens per execution, which is inefficient for regular use.

**Objective:** Implement progressive disclosure and content optimization to reduce token consumption by 40-60% while maintaining full functionality and autonomy.

**Root Cause:** Skills are self-contained with extensive embedded documentation, YAML examples, and duplicated schema definitions.

---

## Current Token Usage Analysis

### Token Breakdown

| Skill | Lines | Tokens | % of Total |
|-------|-------|--------|------------|
| requirements-parsing | 253 | ~1,859 | 16% |
| strategic-decomposition | 342 | ~2,738 | 24% |
| work-order-generation | 365 | ~2,750 | 24% |
| plan-validation | 530 | ~4,217 | 36% |
| **TOTAL** | **1,490** | **~11,564** | **100%** |

**Note:** This is just skill content. Full execution with all 5 phases + validation = ~25,000-35,000 tokens.

### Embedded YAML Examples

**Total: 21 embedded blocks across all skills**

| Skill | Embedded Examples | Token Cost |
|-------|-------------------|------------|
| requirements-parsing | 4 blocks | ~800 tokens |
| strategic-decomposition | 2 blocks | ~400 tokens |
| work-order-generation | 7 blocks | ~1,400 tokens |
| plan-validation | 9 blocks | ~1,800 tokens |
| **Total** | **21 blocks** | **~4,400 tokens** |

### Duplicated Content

1. **WorkOrder schema** - Repeated in:
   - work-order-generation/SKILL.md
   - examples/work-order.yaml
   - scripts/templates/work-order.yaml

2. **RequirementSet schema** - Repeated in:
   - requirements-parsing/SKILL.md
   - examples/requirement-set.yaml
   - scripts/templates/requirement-set.yaml

3. **Common patterns** - Repeated across skills:
   - Verification commands structure
   - Threshold definitions
   - Scope allow/deny lists

---

## Optimization Strategy: 3-Phase Approach (REVISED - Realistic)

### Phase 1A: Progressive Disclosure Moderated (20-25% reduction)

**Objective:** Keep critical examples in SKILL.md for immediate context, move complementary examples to external files.

**KEY INSIGHT from analysis:** Claude Code skills are static markdown - references to external files don't auto-load. Agents would need to use Read tool to access examples/.

**Hybrid Strategy:**
- **Keep in SKILL.md:** 1-2 critical examples per skill that provide immediate context
- **Move to examples/:** Complementary examples that agents can access via Read tool

**Per-Skill Breakdown:**
- requirements-parsing: Keep 1 complete example, move 3 to examples/
- strategic-decomposition: Keep 1 example, move 1 to examples/
- work-order-generation: Keep 2 examples (DoD structure + WorkOrder), move 5 to examples/
- plan-validation: Keep 2 examples (validation report + error), move 7 to examples/

#### 1.1 Create examples/ subdirectories per skill

```
skills/
├── requirements-parsing/
│   ├── SKILL.md (condensed)
│   └── examples/
│       ├── claim-structure.yaml
│       ├── assumption-structure.yaml
│       ├── constraint-structure.yaml
│       └── complete-requirementset.yaml
├── strategic-decomposition/
│   ├── SKILL.md (condensed)
│   └── examples/
│       ├── strategy-format.yaml
│       └── evaluation-format.yaml
├── work-order-generation/
│   ├── SKILL.md (condensed)
│   └── examples/
│       ├── dod-structure.yaml
│       ├── scope-boundaries.yaml
│       ├── dependencies-example.yaml
│       ├── complete-workorder.yaml
│       └── validation-errors.yaml
└── plan-validation/
    ├── SKILL.md (condensed)
    └── examples/
        ├── constraint-satisfaction.yaml
        ├── dod-validation.yaml
        ├── scope-conflicts.yaml
        └── validation-report.yaml
```

#### 1.2 Update SKILL.md files

**Before (work-order-generation: lines 224-274):**
```yaml
## Complete WorkOrder Example
```yaml
WorkOrder:
  id: WO-0001
  title: "Implement user authentication"
  created: "2026-01-15T10:00:00Z"
  plan_id: PLAN-2026-0001
  work_package: E-001
  objective: "Users can log in with email/password"
  [... 50 more lines ...]
```

**After (work-order-generation: condensed):**
```markdown
## Complete WorkOrder Example

See: `examples/complete-workorder.yaml` for a full production-ready WorkOrder with all fields.

Key sections:
- **Metadata**: id, title, created, plan_id, work_package
- **Objective**: Clear, measurable outcome
- **Definition of Done**: 2+ verification commands
- **Scope**: allow/deny file boundaries
- **Dependencies**: Other WOs that must complete first
- **Claim Links**: Which requirements this fulfills
```

#### 1.3 Create canonical schema references

**File: `skills/shared/schemas.yaml`**
```yaml
# Canonical schema definitions for enterprise-planning
# These are the authoritative schemas - all examples should match

# Reference: scripts/templates/work-order.yaml
work_order_schema:
  required_fields:
    - id
    - title
    - created
    - plan_id
    - work_package
    - objective
    - priority
  optional_fields:
    - dependencies
    - estimated_hours
    - claim_links

# Reference: scripts/templates/requirement-set.yaml
requirement_set_schema:
  required_fields:
    - id
    - title
    - created
    - status
  optional_fields:
    - claims
    - assumptions
    - constraints
```

**Update SKILL.md files to reference:**
```markdown
## Schema Definition

See `../shared/schemas.yaml` for canonical field definitions.
Reference template: `../../scripts/templates/work-order.yaml`
```

**Expected savings:** ~3,500-4,500 tokens (30-40% reduction)

---

### Phase 2: Content Consolidation (15-20% additional reduction)

**Objective:** Eliminate duplicated explanations and create shared glossary.

#### 2.1 Create shared glossary

**File: `skills/shared/glossary.md`**
```markdown
# Enterprise Planning Glossary

Common terms used across all skills:

## Core Concepts

- **Claim (C-XXX)**: A functional requirement statement with priority level
- **Assumption (A-XXX)**: An implicit belief with confidence and impact assessment
- **Constraint (CN-XXX)**: A boundary or limitation (hard/soft)
- **Work Order (WO-XXX)**: Executable task unit with Definition of Done
- **Work Package (E-XXX)**: Group of related Work Orders (epic)

## Priority Levels

- **P0**: Critical - must have for MVP/launch
- **P1**: Important - high value, should have if feasible
- **P2**: Nice to have - enhancement, defer to later

## Impact Levels

- **high**: Significant effect on project success
- **medium**: Moderate effect, manageable workarounds exist
- **low**: Minimal effect, easy to mitigate

## Constraint Types

- **timeline**: Deadlines and milestones
- **budget**: Cost limitations
- **technology**: Tech stack restrictions
- **performance**: Performance targets
- **security**: Security requirements
- **compliance**: Regulatory requirements
```

#### 2.2 Remove duplicated explanations

**Example: Priority levels explained in 3 skills**

**Before:**
- requirements-parsing/SKILL.md: lines 40-45 (priority explanation)
- work-order-generation/SKILL.md: lines 50-55 (priority explanation)
- plan-validation/SKILL.md: lines 60-65 (priority explanation)

**After:**
```markdown
## Priority Levels

See: `../shared/glossary.md#priority-levels`

- **P0**: Critical
- **P1**: Important
- **P2**: Nice-to-have
```

**Expected savings:** ~1,800-2,300 tokens (15-20% additional reduction)

---

### Phase 3A: Skill Modularization (5-10% additional reduction)

**Objective:** Split large skills into smaller, focused modules that load only as needed.

**KEY INSIGHT from analysis:** trigger_keywords and phase fields are NOT supported in Claude Code skill frontmatter. Lazy loading as originally proposed is not feasible.

**Alternative: Modularization**

Split plan-validation (currently 530 lines, ~4,217 tokens) into focused skills:

```
plan-validation/ → Split into:
├── validation-basics/SKILL.md      (~1,200 tokens)
│   └── Schema validation, basic traceability
├── validation-dependencies/SKILL.md (~900 tokens)
│   └── Dependency inference, circular checks
├── validation-consistency/SKILL.md  (~800 tokens)
│   └── Objective/DoD consistency validation
└── validation-quality/SKILL.md      (~1,300 tokens)
    └── Code quality review integration
```

**Loading Strategy:**
- `/plan-orch` Phase 5 loads validation-basics (required)
- Additional validation skills load conditionally based on user flags:
  - `--with-dependencies` → validation-dependencies
  - `--with-consistency` → validation-consistency
  - `--with-quality` → validation-quality

**Expected savings:** ~2,400-3,000 tokens when full validation not needed

**Files to create:**
- skills/validation-basics/SKILL.md
- skills/validation-dependencies/SKILL.md
- skills/validation-consistency/SKILL.md
- skills/validation-quality/SKILL.md

**Files to modify:**
- skills/plan-validation/SKILL.md (deprecated or becomes orchestrator)

---

## Implementation Plan

### Phase 1: Progressive Disclosure (High Priority)

**Step 1.1: Create directory structure**
```bash
cd skills/
mkdir -p requirements-parsing/examples
mkdir -p strategic-decomposition/examples
mkdir -p work-order-generation/examples
mkdir -p plan-validation/examples
mkdir -p shared
```

**Step 1.2: Extract embedded YAML to examples/**

For each skill:
1. Identify all YAML code blocks in SKILL.md
2. Create separate .yaml files in examples/
3. Replace with references to example files

**Step 1.3: Create shared schemas**
- Create `skills/shared/schemas.yaml`
- Update all skills to reference canonical schemas

**Files to modify:**
- skills/requirements-parsing/SKILL.md
- skills/strategic-decomposition/SKILL.md
- skills/work-order-generation/SKILL.md
- skills/plan-validation/SKILL.md
- skills/shared/schemas.yaml (NEW)
- skills/shared/glossary.md (NEW)

**Estimated effort:** 3-4 hours

---

### Phase 2: Content Consolidation (Medium Priority)

**Step 2.1: Create shared glossary**
- Create `skills/shared/glossary.md`
- Compile all common terms and definitions

**Step 2.2: Remove duplications**
- Find repeated explanations across skills
- Replace with glossary references
- Consolidate schema definitions

**Files to modify:**
- All 4 SKILL.md files
- skills/shared/glossary.md (NEW)

**Estimated effort:** 2-3 hours

---

### Phase 3: Lazy Loading (Low Priority)

**Step 3.1: Add trigger conditions**
- Update plan-validation/SKILL.md with phase trigger
- Test that it only loads during validation phase

**Step 3.2: Verify conditional loading**
- Test /plan-orch workflow
- Confirm plan-validation doesn't load in Phases 1-4
- Confirm it loads in Phase 5

**Files to modify:**
- skills/plan-validation/SKILL.md

**Estimated effort:** 1-2 hours

---

## Expected Results

### Token Savings Summary (REVISED - Realistic Estimates)

| Phase | Current Tokens | After Optimization | Reduction |
|-------|---------------|-------------------|-----------|
| **Phase 1A: Moderated Progressive Disclosure** | 11,564 | 8,700-9,200 | 20-25% |
| **Phase 2: Content Consolidation** | 8,700-9,200 | 7,000-7,500 | 15-20% |
| **Phase 3A: Skill Modularization** | 7,000-7,500 | 5,200-6,000 | 5-10% |
| **TOTAL** | **11,564** | **5,200-6,000** | **40-55%** |

**Full execution savings (all 5 phases):**
- **Current:** ~25,000-35,000 tokens
- **After optimization:** ~11,000-21,000 tokens
- **Reduction:** 40-55% (still excellent improvement!)

**Note:** Original plan estimated 60-70% reduction, but this was based on assumptions about platform capabilities (lazy loading via frontmatter fields) that are NOT supported by Claude Code. The revised plan is technically feasible and still achieves substantial token savings.

---

## Verification Plan

### Test Case 1: Token Measurement
```bash
# Measure baseline token usage
/plan-orch "Add user authentication with JWT"
# Note: Total tokens consumed

# After optimization
/plan-orch "Add user authentication with JWT"
# Compare: Should be 40-60% less
```

### Test Case 2: Functionality Preservation
```bash
# Test all 5 phases still work
/plan-orch "Implement OAuth2 flow"
# Verify:
# ✅ Phase 1: Requirements parsed
# ✅ Phase 2: Strategies generated
# ✅ Phase 3: Plan tree created
# ✅ Phase 4: Work orders generated
# ✅ Phase 5: Validation passes
```

### Test Case 3: Example Accessibility
```bash
# Test that external examples are accessible
cat skills/work-order-generation/examples/complete-workorder.yaml
# Verify: File exists and contains valid YAML
```

### Test Case 4: Lazy Loading
```bash
# Test that plan-validation only loads in Phase 5
/plan-orch "Simple feature"
# Check: plan-validation skill should NOT load until Phase 5
```

---

## Files to Create

| File | Purpose | Size |
|------|---------|------|
| `skills/shared/schemas.yaml` | Canonical schema definitions | ~100 lines |
| `skills/shared/glossary.md` | Common terms and definitions | ~80 lines |
| `skills/requirements-parsing/examples/*.yaml` | Extracted complementary examples | 3 files |
| `skills/strategic-decomposition/examples/*.yaml` | Extracted complementary examples | 1 file |
| `skills/work-order-generation/examples/*.yaml` | Extracted complementary examples | 5 files |
| `skills/plan-validation/examples/*.yaml` | Extracted complementary examples | 7 files |
| `skills/validation-basics/SKILL.md` | Core validation functionality | ~150 lines |
| `skills/validation-dependencies/SKILL.md` | Dependency inference | ~120 lines |
| `skills/validation-consistency/SKILL.md` | Objective/DoD consistency | ~100 lines |
| `skills/validation-quality/SKILL.md` | Code quality integration | ~130 lines |

## Files to Modify

| File | Changes | Lines |
|------|---------|-------|
| `skills/requirements-parsing/SKILL.md` | Keep 1 example, add references | -60 lines |
| `skills/strategic-decomposition/SKILL.md` | Keep 1 example, add references | -30 lines |
| `skills/work-order-generation/SKILL.md` | Keep 2 examples, add references | -100 lines |
| `skills/plan-validation/SKILL.md` | Keep 2 examples, become orchestrator or deprecate | -140 lines |

**Total new files:** 27 files (~1,080 lines total)
**Total modified files:** 4 files (~330 lines removed)

---

## Success Criteria

v0.2.0 is successful when:

1. ✅ Token consumption reduced by 40-55% (realistic target based on platform capabilities)
2. ✅ All 5 phases of /plan-orch still work correctly
3. ✅ Critical examples remain in SKILL.md for immediate context
4. ✅ Complementary examples are accessible via external files (Read tool)
5. ✅ Shared glossary eliminates duplicate definitions
6. ✅ plan-validation modularized into 4 focused skills
7. ✅ No functionality lost vs v0.1.1

---

## Rollback Plan

If issues arise:

1. **Git branch:** Create `feature/token-optimization` branch
2. **Test thoroughly** before merging to main
3. **Keep v0.1.1 tagged** for easy rollback
4. **Document changes** in CHANGELOG.md

---

## Future Considerations

### v0.3.0 Potential Optimizations

1. **Skill modularization:** Split plan-validation into smaller skills
2. **Conditional content loading:** Load advanced features only when requested
3. **Compression:** Use more concise language without losing clarity
4. **Caching:** Cache schema definitions across sessions

### Trade-offs (REVISED)

| Optimization | Benefit | Cost | Feasibility |
|--------------|---------|------|-------------|
| Moderated progressive disclosure | 20-25% reduction | More files to maintain | **HIGH** - Hybrid approach respects platform limits |
| Content consolidation | 15-20% reduction | Requires following references | **HIGH** - Glossary is excellent pattern |
| Skill modularization | 5-10% reduction | More complex skill structure | **MEDIUM** - Requires refactoring validation logic |

**Decision:** Implement all 3 phases for 40-55% realistic reduction. Original 60-70% target was not technically feasible due to Claude Code platform limitations (no lazy loading via frontmatter).
