# Requirements Parsing

## Overview

This skill guides users through transforming vague requirements into structured `RequirementSet` YAML files that define claims, assumptions, and constraints with clear priority levels and confidence scores.

**Key capabilities:**
- Extract and structure claims (P0/P1/P2 priority levels)
- Identify assumptions with confidence + impact ratings
- Document constraints (hard vs soft)
- Generate acceptance signals for validation
- Create `_ctx/plans/PLAN-YYYY-NNNN/requirements.yaml` files

## Terminology

- **Claim** - Functional requirement statement with priority (P0/P1/P2)
- **Assumption** - Implicit belief with confidence (0.0-1.0) and impact level
- **Constraint** - Hard (must satisfy) or soft (preferable) limitation
- **RequirementSet** - Structured YAML containing claims, assumptions, constraints
- **Confidence** - 0.0-1.0 scale: 0.9-1.0 (high), 0.7-0.9 (medium), <0.7 (low)
- **DoD** - Definition of Done (used in later phases)

## When to Use

**Invoke this skill when:**
- User states a vague or ambiguous requirement ("I need a dashboard")
- User wants to add features to an existing project
- User mentions planning, scoping, or requirements gathering
- User asks questions like "what do I need to build X?"
- Command `/plan-orch` is invoked (Phase 1)

**Trigger phrases:**
- "I need to build..."
- "Add feature for..."
- "Plan for..."
- "Requirements for..."
- "Scope out..."

## Process

### Step 1: Extract Claims

**Identify distinct functional requirements** as claims with:

**Priority levels:**
- **P0 (Critical):** Must have for MVP/launch, blocking without it
- **P1 (Important):** High value, should have if feasible
- **P2 (Nice to have):** Enhancement, defer to later

**For each claim:**
1. Assign unique ID (C-001, C-002, etc.)
2. Write clear, testable statement
3. Set priority (P0/P1/P2)
4. Add acceptance_signals - how will we know it's done?

**Example claim:**
```yaml
- id: C-001
  text: "User login with email/password"
  priority: P0
  acceptance_signals:
    - "User can log in with valid credentials"
    - "Invalid credentials show error message"
    - "Session persists across requests"
```

### Step 2: Identify Assumptions

**Extract implicit assumptions** that could impact delivery:

**For each assumption:**
1. Assign unique ID (A-001, A-002, etc.)
2. State what we're assuming is true
3. Set confidence (0.0-1.0):
   - **0.9-1.0:** Highly confident, well-established
   - **0.7-0.9:** Confident, minor risk
   - **0.5-0.7:** Uncertain, verify early
   - **<0.5:** High risk, spike/research needed
4. Set impact level (low/medium/high)
5. Add rationale explaining why this assumption matters

**Example assumption:**
```yaml
- id: A-001
  text: "Email service (SendGrid/Mailgun) available"
  confidence: 0.9
  impact: high
  rationale: "Required for password reset, account verification"
```

### Step 3: Document Constraints

**Capture boundaries and limitations:**

**Constraint types:**
- `budget`: Cost limitations (e.g., "$10k/month infrastructure")
- `timeline`: Deadlines (e.g., "Must ship by Q2")
- `technology`: Tech stack restrictions (e.g., "Must use Python 3.12+")
- `performance`: Performance targets (e.g., "API response < 200ms p95")
- `compliance`: Regulatory requirements (e.g., "GDPR compliant")
- `security`: Security requirements (e.g., "OWASP compliant")

**For each constraint:**
1. Assign unique ID (CN-001, CN-002, etc.)
2. Set type (from list above or custom)
3. Describe the constraint clearly
4. Set `hard: true` if non-negotiable, `false` if flexible

**Example constraint:**
```yaml
- id: CN-001
  type: timeline
  description: "Must launch by end of Q1 2026"
  hard: false
```

### Step 4: Generate RequirementSet YAML

**Create structured output** at `_ctx/plans/PLAN-YYYY-NNNN/requirements.yaml`:

```yaml
RequirementSet:
  id: RQ-2026-0001
  title: "Brief title describing the requirement"
  created: "2026-01-15T10:00:00Z"
  status: "draft"

  claims:
    - id: C-001
      text: "Clear, testable requirement"
      priority: P0
      acceptance_signals:
        - "Measurable outcome 1"
        - "Measurable outcome 2"

    - id: C-002
      text: "Another requirement"
      priority: P1
      acceptance_signals:
        - "How we validate this"

  assumptions:
    - id: A-001
      text: "What we're assuming is true"
      confidence: 0.8
      impact: medium
      rationale: "Why this matters"

  constraints:
    - id: CN-001
      type: timeline
      description: "Deadline or limitation"
      hard: false
```

### Step 5: Interactive Validation

**Present results to user for confirmation:**

```
✅ **Requirements Parsed**

I've identified **X claims**, **Y assumptions**, and **Z constraints**:

**P0 Claims (Critical - must have):**
- C-001: [text]
- C-002: [text]

**P1 Claims (Important - should have):**
- C-003: [text]

**Key Assumptions:**
- A-001: [text] (confidence: 0.8, impact: high)

**Constraints:**
- CN-001: [type] - [description] [hard/soft]

Review complete file at: _ctx/plans/PLAN-2026-0001/requirements.yaml

**Is this correct?** [Y/n]
```

If user says yes → proceed to next phase.
If user says no → ask what to add/remove/modify.

## Tone and Style

**Be conversational but thorough:**
- "Let me help you structure this requirement..."
- "I've found X claims we should address..."
- "This assumption has low confidence - should we verify it early?"

**Ask clarifying questions:**
- "When you say 'fast', what's your target?"
- "What happens if this assumption is wrong?"
- "Is this deadline hard or flexible?"

**Guide decision-making:**
- "I'd prioritize this as P0 because..."
- "This constraint seems flexible - mark as hard: false?"

> **Complete example:** See `examples/requirement-set.yaml` for a production-ready RequirementSet with realistic complexity.

## Common Patterns

### Web Application Feature
**Input:** "Add user authentication"

**Extract:**
- C-001: User login with email/password (P0)
- C-002: Password reset via email (P1)
- C-003: Social login (Google/GitHub) (P2)
- A-001: Email service available (confidence: 0.9, impact: high)
- CN-001: Session timeout < 24 hours (hard: false)

### Performance Requirement
**Input:** "Make the API fast"

**Extract:**
- C-001: API response time < 200ms p95 (P0)
- C-002: Support 1000 concurrent users (P1)
- A-001: Caching layer available (confidence: 0.7, impact: medium)
- CN-001: Must use Redis for caching (hard: true)

### Integration Task
**Input:** "Integrate with Stripe for payments"

**Extract:**
- C-001: Process one-time payments (P0)
- C-002: Handle subscriptions (P0)
- C-003: Webhook processing (P1)
- A-001: Stripe API available in region (confidence: 0.95, impact: high)
- CN-001: Must be PCI compliant (hard: true)

## Output Format

**Location:** `_ctx/plans/PLAN-YYYY-NNNN/requirements.yaml`

**File naming:**
- Use current year and sequential number
- Example: `PLAN-2026-0001/requirements.yaml`, `PLAN-2026-0002/requirements.yaml`

**Integration:**
- Used by `strategic-decomposition` skill for planning
- Referenced in `plan-tree.yaml` for traceability
- Validated by `plan-validation` skill for schema compliance

## See Also

- **strategic-decomposition** - Next phase after requirements parsing
- **work-order-generation** - Final phase generating executable WOs
- **plan-validation** - Validates complete RequirementSet structure
- **Schema:** `scripts/templates/requirement-set.yaml`
