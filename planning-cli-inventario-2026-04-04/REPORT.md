# Planning CLI - Inventario Curado

Este paquete reúne skills, agentes, comandos, documentación, templates y scripts relevantes para diseñar un CLI de planificación.

## Incluye

- Skills de planificación general (`writing-plans`, `executing-plans`)
- Skills de revisión/auditoría (`tmux-plan-auditor-bak`, `branch-review`)
- Flujo `enterprise-planning` completo (requirements → strategy → work orders → validation)
- Referencias CLOOP (`plan-architect`, recursos CLOOP y `plan-save-workflow`)
- Flujo `mr-plan` (comando + agente evaluador)
- Scripts core de validación y trazabilidad del plugin enterprise-planning

## Ruta original principal analizada

`/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1`

## Manifest

- `skills/general/writing-plans.md` ← `/Users/felipe_gonzalez/.codex/skills/superpowers/skills/writing-plans/SKILL.md`
- `skills/general/executing-plans.md` ← `/Users/felipe_gonzalez/.codex/skills/superpowers/skills/executing-plans/SKILL.md`
- `skills/review/tmux-plan-auditor-bak.md` ← `/Users/felipe_gonzalez/.agents/skills/pi-skills/tmux-plan-auditor.bak/SKILL.md`
- `skills/review/branch-review.md` ← `/Users/felipe_gonzalez/.codex/skills/branch-review/SKILL.md`
- `skills/enterprise-planning/requirements-parsing.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/skills/requirements-parsing/SKILL.md`
- `skills/enterprise-planning/strategic-decomposition.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/skills/strategic-decomposition/SKILL.md`
- `skills/enterprise-planning/work-order-generation.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/skills/work-order-generation/SKILL.md`
- `skills/enterprise-planning/plan-validation.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/skills/plan-validation/SKILL.md`
- `skills/cloop/plan-architect.md` ← `/Users/felipe_gonzalez/.config/superpowers/worktrees/skills-fabrik/wo-lifecycle-harness-skill/skills/generators/plan-architect/SKILL.md`
- `skills/cloop/plan-save-workflow.md` ← `/Users/felipe_gonzalez/.config/superpowers/worktrees/skills-fabrik/wo-lifecycle-harness-skill/skills/workflows/plan-save-workflow/SKILL.md`
- `skills/cloop/resources/cloop-methodology.md` ← `/Users/felipe_gonzalez/.config/superpowers/worktrees/skills-fabrik/wo-lifecycle-harness-skill/skills/generators/plan-architect/resources/cloop-methodology.md`
- `skills/cloop/resources/plan-templates.md` ← `/Users/felipe_gonzalez/.config/superpowers/worktrees/skills-fabrik/wo-lifecycle-harness-skill/skills/generators/plan-architect/resources/plan-templates.md`
- `skills/cloop/resources/risk-identification.md` ← `/Users/felipe_gonzalez/.config/superpowers/worktrees/skills-fabrik/wo-lifecycle-harness-skill/skills/generators/plan-architect/resources/risk-identification.md`
- `agents/enterprise-planning/planner-guide.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/agents/planner-guide.md`
- `agents/multi-review/mr-plan-evaluator.md` ← `/Users/felipe_gonzalez/.claude/plugins/multi-review/agents/mr-plan-evaluator.md`
- `commands/enterprise-planning/plan-orch.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/commands/plan-orch.md`
- `commands/multi-review/mr-plan.md` ← `/Users/felipe_gonzalez/.claude/plugins/multi-review/commands/mr-plan.md`
- `docs/enterprise-planning/README.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/README.md`
- `docs/enterprise-planning/CLAUDE.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/CLAUDE.md`
- `docs/enterprise-planning/INSTALLATION_STATUS.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/INSTALLATION_STATUS.md`
- `docs/enterprise-planning/plans/token-optimization-v0.2.0.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/docs/plans/token-optimization-v0.2.0.md`
- `docs/enterprise-planning/plans/2026-01-16-p0-implementation-review.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/docs/plans/2026-01-16-p0-implementation-review.md`
- `docs/enterprise-planning/shared/dialogs.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/docs/shared/dialogs.md`
- `docs/enterprise-planning/examples/README.md` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/examples/README.md`
- `docs/multi-review/README.md` ← `/Users/felipe_gonzalez/.claude/plugins/multi-review/README.md`
- `config/enterprise-planning/plugin.json` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/plugin.json`
- `config/enterprise-planning/hooks.json` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/hooks/hooks.json`
- `templates/enterprise-planning/requirement-set.yaml` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/scripts/templates/requirement-set.yaml`
- `templates/enterprise-planning/work-order.yaml` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/scripts/templates/work-order.yaml`
- `templates/enterprise-planning/plan-pack.yaml` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/scripts/templates/plan-pack.yaml`
- `scripts/enterprise-planning/plan_validator.py` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/scripts/lib/plan_validator.py`
- `scripts/enterprise-planning/types.py` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/scripts/lib/types.py`
- `scripts/enterprise-planning/traceability.py` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/scripts/lib/traceability.py`
- `scripts/enterprise-planning/consistency_validator.py` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/scripts/lib/consistency_validator.py`
- `scripts/enterprise-planning/dependency_inference.py` ← `/Users/felipe_gonzalez/.claude/plugins/cache/local/enterprise-planning/0.2.1/scripts/lib/dependency_inference.py`
