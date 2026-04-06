# plan_dope — Project Knowledge Base

**Generated:** 2026-04-06
**Commit:** 51d2ae0
**Branch:** main

## OVERVIEW

CLI de planificación supervisada para desarrollo técnico. Produce planes en Markdown, deriva YAML, valida estructura, revisa calidad y emite handoffs. No ejecuta trabajo técnico — artefactos de planificación que otros sistemas consumen.

## STRUCTURE

```
plan_dope/
├── src/
│   ├── index.ts          # CLI entry (Commander setup + banner)
│   ├── cli.ts            # Command registry (9 subcommands)
│   ├── commands/         # Command handlers (dynamic import → core)
│   ├── core/             # Business logic (12 modules)
│   ├── types/            # TypeScript interfaces
│   └── ui/               # Terminal rendering (chalk, boxen)
├── _ctx/                 # Per-project artifacts (plans, review_runs, checkpoints)
├── openspec/             # OpenSpec change tracking
├── tests/                # Vitest test suite
├── CONSTITUTION.md       # Governing laws (MANDATORY read before changes)
├── ARCHITECTURE-v1.md    # Operational architecture (subordinate to constitution)
└── CLAUDE.md             # Agent context summary
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add command | `src/cli.ts` + `src/commands/<name>.ts` | Dynamic import pattern |
| Core logic | `src/core/<module>.ts` | Pure functions, fail-fast |
| Plan lifecycle | `src/core/state.ts` | DRAFT→DERIVED→VALIDATED→REVIEWED→HANDOFF_READY |
| Project resolution | `src/core/resolver.ts` | cwd default, --project override |
| YAML derivation | `src/core/derive.ts` | Markdown → YAML, deterministic |
| Review pipeline | `src/core/review.ts` | Verdict: PASS / PASS_WITH_NOTES / FAIL |
| Checkpoint handoff | `src/core/checkpoint.ts` | Delegates to checkpoint-card skill |
| Plan artifacts | `_ctx/plans/<plan-id>/` | plan.md, plan.yaml, reports |
| Review history | `_ctx/review_runs/<run-id>/` | Immutable evidence |
| Handoff files | `_ctx/checkpoints/YYYY-MM-DD/` | Native markdown writer |

## CONVENTIONS

- **ESM only** — `"type": "module"` in package.json, `.js` extensions in imports
- **Dynamic imports** — commands lazy-load: `await import('./commands/x.js')`
- **Immutable data preferred** — frozen objects, no mutation
- **Fail fast** — clear error messages, no silent failures
- **Validate at boundaries only** — not internally between pure functions
- **`_ctx/` convention** — never `ctx/` without underscore
- **plan.md supremacy** — if Markdown ↔ YAML conflict, Markdown wins
- **Wizard delegates to core** — no duplicate logic between wizard and subcommands
- **File size**: 200-400 lines typical, 800 max

## ANTI-PATTERNS (THIS PROJECT)

- Treating YAML/JSON as source of truth (plan.md is)
- Mixing constitution and architecture in one document
- Including execution inside core v1
- Documenting `execute`/`run`/`apply` as commands
- Bidirectional Markdown ↔ YAML sync
- Formal plugin system before stabilizing internal ports
- `ctx/` without underscore — must be `_ctx/`
- Generalist planning — domain is technical development plans only
- Checkpoint as autonomous subsystem — it's a handoff artifact

## UNIQUE STYLES

- **Hybrid state model**: CLI global metadata + per-project artifacts
- **Three pipelines only**: authoring, validation, review (checkpoint is artifact, not pipeline)
- **Finding references**: `<run-id>:<finding-code>` format (e.g. `run-abc123:F-02`)
- **Cycle history**: `history/cycle-<N>/` — immutable snapshots per `plan close`
- **Observations**: 100% human-authored, never auto-written by commands
- **Corrections log**: requires fingerprint_before + finding_ref in comment HTML

## COMMANDS

```bash
npm run dev          # tsx src/index.ts (no build)
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm test             # vitest run
npm run test:watch   # vitest
npm run lint         # biome check src/
npm run lint:fix     # biome check --write src/
npm run typecheck    # tsc --noEmit
```

## NOTES

- Commands tolerate positional ID for human-facing (`observe`, `close`) but require `--plan-id`/`--id` for automatic ones (`create`, `derive`, `validate`, `review`, `checkpoint`)
- Global config at `~/.plan_dope/config/config.yml`
- No per-project config file in v1 — resolution via flag or global config only
- Tests folder named `tests/` (not `test/` or `__tests__/`)
- Biome for lint/format (not ESLint/Prettier)
- Vitest for testing (not Jest)
