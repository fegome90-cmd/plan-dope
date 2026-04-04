"""
Type definitions for enterprise-planning plugin using Pydantic v2.

Provides type-safe models for all YAML structures:
- RequirementSet: Claims, Assumptions, Constraints
- WorkOrder: Objective, DoD, Scope, Dependencies
- PlanTree: Hierarchical decomposition
- StrategyEvaluation: Strategic alternatives with scoring
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal, List, Optional
from enum import Enum


# =============================================================================
# Enums
# =============================================================================

class Priority(str, Enum):
    """Priority levels for claims and work orders."""
    P0 = "P0"  # Critical - must have for MVP/launch
    P1 = "P1"  # Important - high value, should have if feasible
    P2 = "P2"  # Nice to have - enhancement, defer to later


class Impact(str, Enum):
    """Impact levels for assumptions."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ConstraintType(str, Enum):
    """Types of constraints."""
    TIMELINE = "timeline"
    TECHNOLOGY = "technology"
    SECURITY = "security"
    COMPLIANCE = "compliance"
    BUDGET = "budget"
    PERFORMANCE = "performance"


# =============================================================================
# RequirementSet Models
# =============================================================================

class Claim(BaseModel):
    """A functional requirement statement."""
    id: str = Field(..., pattern=r'^C-\d+$')
    text: str = Field(..., min_length=1)
    priority: Priority
    acceptance_signals: List[str] = Field(default_factory=list)


class Assumption(BaseModel):
    """An implicit belief with confidence and impact."""
    id: str = Field(..., pattern=r'^A-\d+$')
    text: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    impact: Impact
    rationale: Optional[str] = None  # Optional explanation for confidence/impact

    @field_validator('confidence')
    @classmethod
    def check_confidence_levels(cls, v: float) -> float:
        """Validate confidence level and provide warnings."""
        if v < 0.5:
            # High risk - spike/research needed
            pass  # Will be logged as warning
        return v


class Constraint(BaseModel):
    """A limitation (hard or soft) on the implementation."""
    id: str = Field(..., pattern=r'^CN-\d+$')
    type: ConstraintType
    description: str = Field(..., min_length=1)
    hard: bool = True  # True = must satisfy, False = prefer to satisfy


class RequirementSet(BaseModel):
    """Structured requirements with claims, assumptions, constraints."""
    id: str = Field(..., pattern=r'^RQ-\d{4}-\d+$')
    title: str = Field(..., min_length=1)
    created: str  # ISO 8601 datetime string
    status: str = "draft"

    claims: List[Claim] = Field(default_factory=list)
    assumptions: List[Assumption] = Field(default_factory=list)
    constraints: List[Constraint] = Field(default_factory=list)


# =============================================================================
# WorkOrder Models
# =============================================================================

class DoDEntry(BaseModel):
    """Definition of Done verification entry."""
    verification: str = Field(..., min_length=1)
    command: str = Field(..., min_length=1)
    expected_output: str = Field(..., min_length=1)
    threshold: str = Field(..., min_length=1)

    @field_validator('threshold')
    @classmethod
    def threshold_must_be_quantifiable(cls, v: str) -> str:
        """Ensure threshold is quantifiable (not vague)."""
        vague_terms = {'fast', 'good', 'bad', 'slow', 'nice', 'well', 'better', 'best'}
        if any(term in v.lower() for term in vague_terms):
            # Will be logged as warning
            pass
        return v


class ScopeEntry(BaseModel):
    """Scope boundaries for a WorkOrder."""
    allow: List[str] = Field(default_factory=list)
    deny: List[str] = Field(default_factory=list)


class WorkOrder(BaseModel):
    """An executable task unit with measurable outcome."""
    id: str = Field(..., pattern=r'^WO-\d+$')
    title: str = Field(..., min_length=1)
    created: str  # ISO 8601 datetime string
    plan_id: str = Field(..., pattern=r'^PLAN-\d{4}-\d+$')
    work_package: Optional[str] = Field(None, pattern=r'^E-\d+$')

    objective: str = Field(..., min_length=1)
    definition_of_done: List[DoDEntry] = Field(default_factory=list)
    scope: ScopeEntry = Field(default_factory=ScopeEntry)
    dependencies: List[str] = Field(default_factory=list)

    priority: Priority
    estimated_hours: Optional[int] = None

    claim_links: List[str] = Field(default_factory=list)

    @field_validator('definition_of_done')
    @classmethod
    def dod_must_have_minimum_commands(cls, v: List[DoDEntry]) -> List[DoDEntry]:
        """Ensure DoD has at least 2 verification commands."""
        if len(v) < 2:
            # Will be logged as warning
            pass
        return v


# =============================================================================
# PlanTree Models
# =============================================================================

class WorkOrderReference(BaseModel):
    """Reference to a WorkOrder in the plan tree."""
    id: str = Field(..., pattern=r'^WO-\d+$')
    title: str
    dependencies: List[str] = Field(default_factory=list)


class WorkPackage(BaseModel):
    """A group of related WorkOrders (Epic)."""
    id: str = Field(..., pattern=r'^E-\d+$')
    title: str
    work_orders: List[WorkOrderReference] = Field(default_factory=list)


class PlanTree(BaseModel):
    """Hierarchical decomposition from Vision to WorkOrders."""
    id: str = Field(..., pattern=r'^PLAN-\d{4}-\d+$')
    created: str  # ISO 8601 datetime string

    vision: str = Field(..., min_length=1)
    strategy_id: str = Field(..., pattern=r'^STRAT-\d+$')
    strategy_name: str
    architecture: Optional[str] = None

    work_packages: List[WorkPackage] = Field(default_factory=list)


# =============================================================================
# StrategyEvaluation Models
# =============================================================================

class StrategyScore(BaseModel):
    """Scores for a strategy on each dimension."""
    constraint_satisfaction: int = Field(..., ge=1, le=5)
    time_to_value: int = Field(..., ge=1, le=5)
    complexity: int = Field(..., ge=1, le=5)
    auditability: int = Field(..., ge=1, le=5)
    adaptability: int = Field(..., ge=1, le=5)

    def average(self) -> float:
        """Calculate average score."""
        return (
            self.constraint_satisfaction +
            self.time_to_value +
            self.complexity +
            self.auditability +
            self.adaptability
        ) / 5


class Strategy(BaseModel):
    """A strategic alternative with evaluation."""
    id: str = Field(..., pattern=r'^STRAT-\d+$')
    name: str
    archetype: str  # e.g., "incremental", "comprehensive", "buy", "modular"
    description: str

    scores: StrategyScore
    assessment: str
    rationale: str


class StrategyEvaluation(BaseModel):
    """Evaluation of multiple strategic alternatives."""
    plan_id: str = Field(..., pattern=r'^PLAN-\d{4}-\d+$')
    created: str  # ISO 8601 datetime string

    strategies: List[Strategy] = Field(default_factory=list)
    selected_strategy_id: Optional[str] = Field(None, pattern=r'^STRAT-\d+$')


# =============================================================================
# Validation Report Models
# =============================================================================

class ValidationIssue(BaseModel):
    """A single validation issue."""
    code: str  # e.g., "VAL_SCHEMA_001"
    severity: Literal["critical", "high", "medium", "low"]
    file: str
    line: Optional[int] = None
    message: str
    context: Optional[str] = None


class TraceabilityResult(BaseModel):
    """Result of traceability checking."""
    all_claims_addressed: bool
    orphaned_claims: List[str] = Field(default_factory=list)
    all_wos_have_files: bool
    missing_wo_files: List[str] = Field(default_factory=list)
    no_circular_dependencies: bool
    circular_dependency_chains: List[List[str]] = Field(default_factory=list)
    all_dods_valid: bool
    invalid_dods: List[str] = Field(default_factory=list)


class ValidationResult(BaseModel):
    """Complete validation result for a plan."""
    plan_id: str = Field(..., pattern=r'^PLAN-\d{4}-\d+$')
    validated_at: str  # ISO 8601 datetime string
    passed: bool

    schema_validation: bool
    traceability: TraceabilityResult
    constraint_satisfaction: bool
    scope_conflicts: bool

    issues: List[ValidationIssue] = Field(default_factory=list)


# =============================================================================
# Exceptions
# =============================================================================

class ValidationError(Exception):
    """Base exception for validation errors."""
    def __init__(self, message: str, exit_code: int):
        self.message = message
        self.exit_code = exit_code
        super().__init__(message)


# =============================================================================
# Dependency Inference Models
# =============================================================================

class DependencySuggestion(BaseModel):
    """A suggested dependency between two Work Orders."""
    source_wo: str = Field(..., pattern=r'^WO-\d+$')
    depends_on: str = Field(..., pattern=r'^WO-\d+$')
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0.0-1.0")
    reason: str = Field(..., min_length=1, description="Human-readable explanation")
    evidence: List[str] = Field(default_factory=list, description="Supporting evidence")
    suggestion_type: Literal["create_modify", "import_usage", "api_endpoint", "test_dependency"] = Field(
        ..., description="Type of dependency detected"
    )

    @field_validator('confidence')
    @classmethod
    def check_confidence_levels(cls, v: float) -> float:
        """Validate confidence level and provide warnings."""
        if v < 0.5:
            # Low confidence - manual review recommended
            pass  # Will be logged as warning
        return v


class DependencyInferenceResult(BaseModel):
    """Result of dependency inference analysis."""
    plan_id: str = Field(..., pattern=r'^PLAN-\d{4}-\d+$')
    analyzed_at: str  # ISO 8601 datetime string
    total_work_orders: int = Field(..., ge=0)
    suggestions: List[DependencySuggestion] = Field(default_factory=list)
    high_confidence_count: int = Field(default=0, ge=0, description="Suggestions with confidence >= 0.8")
    medium_confidence_count: int = Field(default=0, ge=0, description="Suggestions with confidence 0.5-0.8")
    low_confidence_count: int = Field(default=0, ge=0, description="Suggestions with confidence < 0.5")


# =============================================================================
# Consistency Validation Models
# =============================================================================

class ConsistencyIssue(BaseModel):
    """A consistency issue between objective and DoD."""
    wo_id: str = Field(..., pattern=r'^WO-\d+$')
    issue_type: Literal["missing_keyword", "contradiction", "quantitative_mismatch", "vague_threshold"]
    severity: Literal["critical", "high", "medium", "low"]
    objective_excerpt: str = Field(..., description="Relevant excerpt from objective")
    dod_excerpt: Optional[str] = Field(None, description="Relevant DoD entry causing issue")
    description: str = Field(..., min_length=1, description="Issue description")
    suggestion: str = Field(..., min_length=1, description="Actionable suggestion")


class ConsistencyValidationResult(BaseModel):
    """Result of consistency validation."""
    plan_id: str = Field(..., pattern=r'^PLAN-\d{4}-\d+$')
    analyzed_at: str  # ISO 8601 datetime string
    total_work_orders: int = Field(..., ge=0)
    consistent_work_orders: int = Field(..., ge=0)
    inconsistent_work_orders: int = Field(..., ge=0)
    overall_consistency_score: float = Field(..., ge=0.0, le=1.0)
    issues: List[ConsistencyIssue] = Field(default_factory=list)


# =============================================================================
# Exit Codes
# =============================================================================

class ExitCode(int, Enum):
    """Standard exit codes for validation scripts."""
    SUCCESS = 0
    SCHEMA_ERROR = 1
    TRACEABILITY_ERROR = 2
    CONSTRAINT_ERROR = 3
    SCOPE_CONFLICT = 4
    DEPENDENCY_INFERENCE_ERROR = 5
    CONSISTENCY_VALIDATION_ERROR = 6

