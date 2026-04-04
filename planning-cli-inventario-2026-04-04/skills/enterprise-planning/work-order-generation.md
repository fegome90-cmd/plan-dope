# Work Order Generation

## Overview

This skill guides users through transforming a hierarchical plan tree into executable `WorkOrder` YAML files with clear objectives, measurable Definition of Done (DoD), scope boundaries, and dependency management.

**Key capabilities:**
- Generate WorkOrder YAML files for each WO in the plan tree
- Create Definition of Done with 2+ verification commands
- Define scope boundaries (allow/deny lists) for conflict prevention
- Manage dependencies between Work Orders
- Output to `_ctx/plans/PLAN-YYYY-NNNN/work_orders/` and `_ctx/jobs/`

## When to Use

**Invoke this skill when:**
- Plan tree decomposition is complete and approved
- User needs to generate executable Work Orders
- Command `/plan-orch` is invoked (Phase 4)
- User asks to "generate work orders" or "create WOs"

**Trigger phrases:**
- "Generate work orders from plan tree"
- "Create DoD for each work order"
- "Define scope boundaries for WOs"
- "Turn the plan tree into executable tasks"

## Process

### Step 1: Load Plan Tree

**Read the hierarchical decomposition:**

```bash
_ctx/plans/PLAN-2026-0001/plan-tree.yaml
```

**Extract:**
- All Work Order IDs (WO-0001, WO-0002, etc.)
- Parent Work Package (Epic) associations
- Dependencies between WOs
- Brief descriptions from decomposition

**Validate:**
- Plan tree exists and is valid YAML
- All WOs have unique IDs
- Dependency graph is acyclic (no circular dependencies)

---

### Step 2: Generate WorkOrder YAML Files

**For each WO in the plan tree, create `WO-XXXX.yaml`:**

#### 2.1 Define Objective (Measurable)

**Write a clear, testable objective statement:**

```yaml
objective: |
  Users can log in to the application using email and password credentials.
  Invalid credentials show specific error messages. Valid sessions persist
  for 24 hours with "remember me" option.
```

**Objective criteria:**
- **Specific:** What exactly will be done?
- **Measurable:** How do we know it's complete?
- **Achievable:** Can this be completed in 1-3 days?
- **Relevant:** Does this directly address a claim/requirement?
- **Time-boxed:** Fits within a single WO scope

---

#### 2.2 Create Definition of Done (DoD)

**Definition of Done requires 2+ verification commands:**

```yaml
definition_of_done:
  - verification: "Run authentication tests"
    command: "pytest tests/test_auth.py -v"
    expected_output: "PASSED"

  - verification: "Verify login endpoint exists"
    command: "curl -f http://localhost:8000/api/auth/login || exit 1"
    expected_output: "HTTP/1.1 200"

  - verification: "Check session persistence"
    command: |
      curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \
        -d '{"email":"test@example.com","password":"test"}'
      curl -b cookies.txt http://localhost:8000/api/auth/me
    expected_output: '"authenticated": true'
```

**DoD requirements:**
- **Minimum 2 verification commands** (preferred: 3+)
- **Quantifiable thresholds** (numbers, percentages, specific outputs)
- **Executable commands** (bash, curl, pytest, etc.)
- **Specific expected outputs** (not "fast" or "good")

**DoD anti-patterns to avoid:**
- Vague thresholds: "runs fast", "looks good", "works well"
- Single verification command (fragile, insufficient)
- Non-measurable: "code is clean", "follows best practices"

---

#### 2.3 Define Scope Boundaries (Allow/Deny Lists)

**Prevent conflicts with explicit file/path ownership:**

```yaml
scope:
  allow:
    - "src/auth/**/*"
    - "tests/test_auth.py"
    - "docs/api/authentication.md"
  deny:
    - "src/auth/oauth/**/*"  # Reserved for WO-0005
    - "src/auth/mfa/**/*"    # Reserved for WO-0006
```

**Scope rules:**
- **Allow list:** Files/directories this WO CAN modify
- **Deny list:** Explicit exclusions (usually reserved for other WOs)
- **Prevent conflicts:** Two WOs should not have overlapping allow lists
- **Parent/child:** Child directories inherit parent rules

**Scope conflict examples:**
- ❌ WO-0001 allows `src/auth/**/*`, WO-0002 allows `src/auth/login.py`
- ✅ WO-0001 allows `src/auth/**/*` but denies `src/auth/oauth/**/*`, WO-0002 allows `src/auth/oauth/**/*`

---

#### 2.4 Set Dependencies

**Link to other WOs that must complete first:**

```yaml
dependencies:
  - WO-0001  # User model must exist before we can authenticate
  - WO-0002  # Database schema must be migrated
```

**Dependency rules:**
- **Acyclic:** No circular dependencies (A→B→C→A)
- **Minimal:** Only include true blocking dependencies
- **Valid references:** All dependency IDs must exist in plan tree
- **Document rationale:** Why is this dependency needed?

---

#### 2.5 Run Dependency Inference (Auto-Detect Missing Dependencies)

**Auto-detect missing dependencies by analyzing:**

```bash
python ${CLAUDE_PLUGIN_ROOT}/scripts/lib/dependency_inference.py \
  _ctx/plans/PLAN-2026-0001/work_orders \
  --confidence-threshold 0.7
```

**Detection methods:**
- **Create→Modify pattern:** WO-0002 modifies files created by WO-0001
- **Import usage:** WO-0003 imports `src.auth.models` (created by WO-0001)
- **API endpoints:** WO-0004 tests `/api/auth/refresh` (requires WO-0002's `/api/auth/login`)

**Review suggestions:**
- **High confidence (≥ 0.8):** Consider adding to dependencies
- **Medium confidence (0.5-0.8):** Review before adding
- **Low confidence (< 0.5):** Manual review required

**Update dependencies if needed:**

```yaml
dependencies:
  - WO-0001  # User model must exist (detected: imports src.auth.models)
  - WO-0002  # Login endpoint (detected: tests /api/auth/refresh)
```

---

### Step 3: Output WorkOrder Files

**Create WorkOrder YAML files:**

```bash
_ctx/plans/PLAN-2026-0001/work_orders/
├── WO-0001.yaml
├── WO-0002.yaml
├── WO-0003.yaml
└── ...
```

**Also copy to `_ctx/jobs/` for work_O consumption:**

```bash
_ctx/jobs/
├── WO-0001.yaml
├── WO-0002.yaml
└── ...
```

---

### Step 4: Generate DoD Files (Optional)

**For complex WOs, create separate DoD file:**

```bash
_ctx/plans/PLAN-2026-NNNN/dods/
├── WO-0001-dod.yaml
└── WO-0002-dod.yaml
```

**DoD file structure:**

```yaml
work_order_id: WO-0001
work_order_title: "Implement login endpoint"

verification_steps:
  - step: 1
    name: "Unit tests pass"
    command: "pytest tests/test_auth/test_login.py -v"
    threshold: "100% tests pass"
    weight: critical

  - step: 2
    name: "API endpoint responds"
    command: "curl -f http://localhost:8000/api/auth/login"
    threshold: "HTTP 200 response"
    weight: critical

  - step: 3
    name: "Documentation complete"
    command: "grep -q 'POST /api/auth/login' docs/api.md"
    threshold: "Endpoint documented"
    weight: important
```

---

## Output Format

> **Complete examples available in:** `examples/` directory
> - `examples/work-order.yaml` - Full WorkOrder with all fields
> - `examples/requirement-set.yaml` - Complete RequirementSet
>
> The example below shows the key structure. See examples directory for production-ready templates.

### Complete WorkOrder Example

```yaml
WorkOrder:
  id: WO-0001
  title: "Implement login endpoint"
  created: "2026-01-15T10:00:00Z"
  plan_id: PLAN-2026-0001
  work_package: E-001  # Parent Epic/Work Package

  objective: |
    Users can authenticate via email/password. Valid credentials return
    an auth token. Invalid credentials return specific error codes.
    Sessions persist for 24 hours.

  definition_of_done:
    - verification: "Authentication tests pass"
      command: "pytest tests/test_auth/test_login.py -v"
      expected_output: "3 passed"
      threshold: "100% test pass rate"

    - verification: "Login endpoint accessible"
      command: "curl -f http://localhost:8000/api/auth/login -d '{\"email\":\"test@example.com\",\"password\":\"test\"}'"
      expected_output: '{"token":'
      threshold: "Returns JWT token"

    - verification: "Invalid credentials rejected"
      command: "curl http://localhost:8000/api/auth/login -d '{\"email\":\"test@example.com\",\"password\":\"wrong\"}'"
      expected_output: '{"error": "invalid_credentials"}'
      threshold: "Returns 401 with error"

  scope:
    allow:
      - "src/auth/login.py"
      - "src/auth/models.py"
      - "tests/test_auth/test_login.py"
      - "docs/api/authentication.md"
    deny:
      - "src/auth/oauth/**/*"  # Reserved for WO-0005
      - "src/auth/mfa/**/*"    # Reserved for WO-0006

  dependencies:
    - WO-0002  # User model
    - WO-0003  # Database schema

  priority: P0
  estimated_hours: 16

  claim_links:
    - C-001  # "User login with email/password"
```

---

## Files Created

**Phase 4 outputs:**

```
_ctx/plans/PLAN-2026-0001/
├── work_orders/              # WorkOrder YAML files
│   ├── WO-0001.yaml
│   ├── WO-0002.yaml
│   └── ...
└── dods/                     # Optional DoD detail files
    ├── WO-0001-dod.yaml
    └── ...

_ctx/jobs/                    # Copied for work_O
├── WO-0001.yaml
├── WO-0002.yaml
└── ...
```

---

## Error Handling

**If plan tree is missing:**
```
❌ Error: plan-tree.yaml not found
- Expected: _ctx/plans/PLAN-2026-0001/plan-tree.yaml
- Action: Ensure Phase 3 (decomposition) completed successfully
```

**If circular dependency detected:**
```
❌ Error: Circular dependency in WO graph
- Cycle: WO-0001 → WO-0002 → WO-0003 → WO-0001
- Action: Remove one dependency to break the cycle
```

**If DoD has only 1 verification command:**
```
⚠️  Warning: WO-0001 has only 1 verification command
- Recommendation: Add at least one more verification command
- Risk: Single verification may be fragile or insufficient
```

**If DoD has vague thresholds:**
```
⚠️  Warning: WO-0002 DoD contains vague thresholds
- Vague: "runs fast", "good performance"
- Recommended: Use numbers, percentages, specific outputs
- Example: "Response time < 200ms" instead of "fast"
```

---

## Best Practices

### Objective Writing
- ✅ DO: Write measurable outcomes ("Users can log in with valid credentials")
- ❌ DON'T: Write activities ("Implement login code")

### DoD Creation
- ✅ DO: Use 2-3 verification commands with specific expected outputs
- ❌ DON'T: Use single verification or vague thresholds

### Scope Definition
- ✅ DO: Define explicit allow/deny lists to prevent conflicts
- ❌ DON'T: Leave scope undefined (implicitly allows everything)

### Dependencies
- ✅ DO: Only include true blocking dependencies
- ❌ DON'T: Create dependency chains that slow down parallel work

---

## Integration Points

**Next Phase:** Plan Validation (Phase 5)
- After WO generation, validation checks:
  - All WOs have valid YAML schemas
  - All DoDs have 2+ verification commands
  - No circular dependencies
  - No scope conflicts

**work_O Integration:**
- WO files copied to `_ctx/jobs/` for work_O backend consumption
- work_O reads WorkOrder YAML and executes verification commands
- work_O uses allow/deny lists for concurrent execution safety
