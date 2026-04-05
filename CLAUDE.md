# plan_dope

CLI para generar, validar y revisar planes técnicos de desarrollo.

## Stack

- **Runtime:** TypeScript + Node.js (ESM)
- **CLI framework:** Commander.js
- **YAML parsing:** `yaml` package
- **Build:** tsc
- **Dev:** tsx
- **Test:** Vitest + coverage-v8
- **Lint/Format:** Biome
- **Type check:** tsc --noEmit

## Architecture

Three core pipelines + one handoff artifact:

1. **Authoring** → `plan.md` (human authority)
2. **Validation** → `plan.yaml` + `validation-report.yaml` (derived)
3. **Review** → `review-report.md` (verdict: PASS / PASS_WITH_NOTES / FAIL)
4. **Checkpoint** → handoff via `checkpoint-card` skill (not a standalone pipeline)

### Key Rules

- `plan.md` is the single source of truth. YAML is derived. If conflict, Markdown wins.
- Artifacts live in `_ctx/plans/<plan-id>/` within each target project.
- Multi-project: `cwd` by default, `--project <path>` as explicit override.
- No execution inside core v1 — plans are consumed externally.

### Commands

`plan create` | `plan derive` | `plan validate` | `plan review` | `plan checkpoint` | `plan wizard`

### Plan States

`DRAFT → DERIVED → VALIDATED → REVIEWED → HANDOFF_READY`

## Conventions

- Immutable data preferred (frozen objects, no mutation)
- Error handling: fail fast with clear messages
- Validate at system boundaries only
- Files: 200-400 lines typical, 800 max
- Convention: `_ctx/` (not `ctx/`) for project artifacts

## Foundational Docs

- `CONSTITUTION.md` — governing laws and principles
- `ARCHITECTURE-v1.md` — operational architecture (subordinate to constitution)
