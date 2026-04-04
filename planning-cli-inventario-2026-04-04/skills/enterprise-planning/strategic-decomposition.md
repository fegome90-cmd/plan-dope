# Strategic Decomposition

## Overview

This skill guides users through generating and evaluating 3-5 strategic alternatives for implementing requirements, then decomposing the selected strategy into a hierarchical plan tree (Vision → Strategy → Architecture → Work Packages → Work Orders).

**Key capabilities:**
- Generate diverse strategic alternatives with trade-offs
- Score strategies against constraints, time-to-value, complexity, auditability, adaptability
- Build hierarchical plan trees with clear decomposition
- Document rationale for strategic decisions
- Create `strategies/strategy-evaluation.yaml` and `plan-tree.yaml`

## Terminology

- **Strategy** - High-level implementation approach with trade-offs
- **Plan Tree** - Hierarchical decomposition structure (hyphenated format)
- **Strategy Evaluation** - Scoring matrix comparing alternatives (1-5 scale per dimension)
- **Work Package (Epic)** - Grouped related Work Orders under a common theme
- **Work Order (WO)** - Individual executable task unit (capitalized when formal)
- **Constraint Satisfaction** - How well a strategy meets requirements (5=perfect, 1=violates)
- **Time-to-Value** - Speed of delivering initial value (5=days, 1=months)

## When to Use

**Invoke this skill when:**
- Requirements have been parsed (after `requirements-parsing`)
- User needs to evaluate implementation approaches
- User asks "how should we build this?" or "what's the best approach?"
- Command `/plan-orch` is invoked (Phase 2)

**Trigger phrases:**
- "What's the best way to..."
- "How should we approach..."
- "Generate strategies for..."
- "Evaluate options for..."

## Process

### Step 1: Generate Strategic Alternatives

**Create 3-5 distinct approaches** for implementing the requirements. Each strategy should represent a different philosophical approach with meaningful trade-offs.

**Strategy archetypes:**
1. **Incremental/MVP-First:** Ship fast, iterate, defer complexity
2. **Comprehensive/Big-Bang:** Build everything at once, high upfront cost
3. **Buy/Integrate:** Use existing services vs. build from scratch
4. **Modular/Plugin-Based:** Extensible architecture, higher initial complexity
5. **Monolithic/Integrated:** Simpler deployment, harder to extend later

**For each strategy:**
1. Assign unique ID (STRAT-001, STRAT-002, etc.)
2. Give it a descriptive name (3-8 words)
3. Write 2-3 sentence description explaining the approach
4. List key trade-offs (what you gain vs. what you sacrifice)

**Example strategies:**
```
STRAT-001: "JWT with Refresh Tokens (Incremental)"
→ Start with basic JWT, add refresh tokens later, defer OAuth

STRAT-002: "OAuth 2.0 from Day 1 (Comprehensive)"
→ Full OAuth implementation, social login ready, longer initial dev

STRAT-003: "Auth0/Firebase Auth Integration (Buy)"
→ External service, fastest to market, recurring cost, vendor lock-in
```

### Step 2: Score Strategies

**Evaluate each strategy** across 5 dimensions using 1-5 scale:

| Dimension | Description |
|-----------|-------------|
| **constraint_satisfaction** | How well does it satisfy stated constraints? (1=violets, 5=perfect) |
| **time_to_value** | How fast can we ship value? (1=months, 5=days) |
| **complexity** | How complex is implementation? (1=very complex, 5=very simple) |
| **auditability** | How easy to verify correctness? (1=opaque, 5=transparent) |
| **adaptability** | How easy to change/extend later? (1=rigid, 5=flexible) |

**Scoring rubric:**
- **5:** Excellent - clearly best option
- **4:** Good - minimal concerns
- **3:** Adequate - some concerns but workable
- **2:** Poor - significant concerns
- **1:** Unacceptable - major blockers

**Calculate total score** and recommend highest (or explain if lower score preferred).

**Example evaluation:**
```yaml
strategies:
  - id: STRAT-001
    name: "JWT with Refresh Tokens (Incremental)"
    description: "Start with basic JWT auth, add refresh tokens in phase 2"
    scores:
      constraint_satisfaction: 5  # Meets all constraints
      time_to_value: 4            # Ship basic auth quickly
      complexity: 4               # Well-understood pattern
      auditability: 4             # Standard JWT, easy to debug
      adaptability: 3             # Can add OAuth later but requires migration
    total_score: 20
    recommendation: SELECTED
    rationale: "Best balance of speed, simplicity, and future extensibility"

  - id: STRAT-002
    name: "OAuth 2.0 from Day 1 (Comprehensive)"
    scores:
      constraint_satisfaction: 3  # Timeline constraint at risk
      time_to_value: 2            # Slower initial delivery
      complexity: 2               # Complex implementation
      auditability: 3             # OAuth complexity
      adaptability: 5             # Fully extensible
    total_score: 15
```

### Step 3: Present Options and Get Selection

**Show strategies with scores** to user:

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

Wait for user selection before proceeding.

### Step 4: Build Plan Tree

**Decompose selected strategy** into hierarchical plan tree:

**Hierarchy levels:**
```
Vision
  └─ Strategy: [Selected strategy]
       └─ Architecture: [High-level architecture pattern]
            └─ Work Packages (Epics)
                 └─ Work Orders (Executable tasks)
```

**Plan tree structure:**

**Vision Level:**
- Overall project goal and success criteria
- Links to RequirementSet (RQ-YYYY-NNNN)

**Strategy Level:**
- Selected strategy (STRAT-XXX)
- Strategic objectives and approach

**Architecture Level:**
- High-level architecture patterns
- Technology choices
- Integration points

**Work Package (Epic) Level:**
- Group related Work Orders
- 2-5 Work Orders per Work Package
- Epic IDs: E-001, E-002, etc.

**Work Order Level:**
- Individual executable tasks
- Each WO should be completable in 1-3 days
- WO IDs: WO-0001, WO-0002, etc.

**Example plan tree:**
```yaml
PlanTree:
  id: PLAN-2026-0001
  requirement_set: RQ-2026-0001
  selected_strategy: STRAT-001

  vision:
    id: V-001
    title: "User Authentication System"
    objective: "Enable secure user access with JWT-based authentication"
    success_criteria:
      - "Users can log in with email/password"
      - "Sessions persist securely with refresh tokens"

  strategy:
    id: STRAT-001
    name: "JWT with Refresh Tokens (Incremental)"
    approach: "Start with basic JWT, add refresh tokens in phase 2"
    phases:
      - "Phase 1: Basic JWT authentication (login, token validation)"
      - "Phase 2: Add refresh token rotation"

  architecture:
    pattern: "Stateless JWT with token refresh service"
    components:
      - "Auth service (JWT generation/validation)"
      - "User service (credential verification)"
      - "Token refresh service (refresh token rotation)"
    tech_stack:
      - "Python 3.12+"
      - "FastAPI"
      - "python-jose for JWT"

  work_packages:
    - id: E-001
      title: "Auth Service Core"
      description: "JWT token generation and validation"
      work_orders:
        - WO-0001: "Setup JWT infrastructure (keys, signing)"
        - WO-0002: "Implement login endpoint"
        - WO-0003: "Implement token validation middleware"

    - id: E-002
      title: "User Credentials"
      description: "User authentication data management"
      work_orders:
        - WO-0004: "Create user schema with password hashing"
        - WO-0005: "Implement password verification"
```

### Step 5: Present Plan Tree for Review

**Show hierarchical breakdown** to user:

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

## Tone and Style

**Be analytical but accessible:**
- "I'll generate several strategic options for you..."
- "Here are 3 distinct approaches with different trade-offs..."
- "I recommend STRAT-001 because..."

**Explain trade-offs clearly:**
- "This approach is faster to ship but harder to extend later"
- "That strategy costs more monthly but reduces development risk"

**Guide decision-making:**
- "If timeline is critical, consider STRAT-001"
- "If you need maximum flexibility, STRAT-003 is better"

## Common Patterns

### Authentication System
**Strategies:**
1. JWT + refresh tokens (incremental)
2. OAuth 2.0 from scratch (comprehensive)
3. Auth0/Firebase (buy/integrate)
4. Session-based with Redis (traditional)

### API Development
**Strategies:**
1. REST + OpenAPI (standard)
2. GraphQL (flexible queries)
3. gRPC (high performance)
4. Serverless functions (cloud-native)

### Data Pipeline
**Strategies:**
1. Batch processing (simple)
2. Stream processing (real-time)
3. Cloud-managed (AWS/GCP)
4. Open source stack (Airflow + dbt)

## Output Format

**Files created:**
1. `_ctx/plans/PLAN-YYYY-NNNN/strategies/strategy-evaluation.yaml`
   - All strategies with scores and rationale

2. `_ctx/plans/PLAN-YYYY-NNNN/plan-tree.yaml`
   - Hierarchical decomposition from vision to WOs

**Integration:**
- Strategies reference RequirementSet (`requirement_set: RQ-YYYY-NNNN`)
- Plan tree selected_strategy links to chosen STRAT-XXX
- Work Orders expanded by `work-order-generation` skill

## Scoring Examples

### High Time-to-Value (Score 5)
- "Ship core feature in 3 days with placeholders"
- "MVP in 1 sprint, iterate afterward"

### Low Time-to-Value (Score 1)
- "3-month foundational work before first user value"
- "Full system rebuild required"

### High Complexity (Score 1)
- "Requires custom protocol implementation"
- "Multi-phase migration with no shortcuts"

### Low Complexity (Score 5)
- "Single REST endpoint, standard library only"
- "Well-documented pattern, copy-pasteable"

## See Also

- **requirements-parsing** - Previous phase, generates RequirementSet
- **work-order-generation** - Next phase, expands WOs with DoD
- **plan-validation** - Validates plan tree completeness and traceability
