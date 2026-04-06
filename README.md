# plan_dope

CLI para generar, validar y revisar planes técnicos de desarrollo.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-ESM-green.svg)](https://nodejs.org/)
![Tests](https://img.shields.io/badge/Tests-74%2F74-brightgreen.svg)
[![Biome](https://img.shields.io/badge/code%20style-biome-60a5fa.svg)](https://biomejs.dev/)

## Purpose

`plan_dope` produce planes técnicos legibles, validables y transferibles. Mantiene al humano como autor y criterio final (`plan.md`), mientras el sistema se encarga de derivar estructura YAML, validar consistencia, revisar calidad y producir handoffs para transferencia de contexto.

**No ejecuta trabajo técnico.** Su función es producir artefactos de planificación que otros sistemas consumen.

## Installation

```bash
git clone https://github.com/fegome90-cmd/plan-dope.git
cd plan-dope
npm install
npm run build
```

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 22+ (ESM) |
| npm | any |
| Git | required (plans live in git repos) |

## Quick Start

Run the interactive wizard from within any git repository:

```bash
npx tsx src/index.ts wizard
```

Or use individual commands:

```bash
# 1. Create a plan skeleton
npx tsx src/index.ts create --id my-feature

# 2. Derive structured YAML from plan.md
npx tsx src/index.ts derive --plan-id my-feature

# 3. Validate the derived YAML
npx tsx src/index.ts validate --plan-id my-feature

# 4. Review and produce a verdict
npx tsx src/index.ts review --plan-id my-feature

# 5. Create a handoff checkpoint
npx tsx src/index.ts checkpoint --plan-id my-feature
```

## Commands

| Command | Description | Options |
|---------|-------------|---------|
| `plan create` | Create `plan.md` skeleton | `--id <plan-id>`, `--project <path>` |
| `plan derive` | Derive `plan.yaml` from `plan.md` | `--plan-id <plan-id>`, `--project <path>` |
| `plan validate` | Validate `plan.yaml` and produce report | `--plan-id <plan-id>`, `--project <path>` |
| `plan review` | Structural review: checks coherence, fingerprints, and completeness | `--plan-id <plan-id>`, `--project <path>` |
| `plan checkpoint` | Create handoff artifact | `--plan-id <plan-id>`, `--project <path>`, `--reason <pause\|transfer\|completion>` |
| `plan wizard` | Interactive pipeline: create → derive → validate → review → checkpoint | `--project <path>` |
| `plan completion` | Generate shell completion script | `<bash\|zsh\|fish>` |

### Common Options

All commands (except `completion`) support the following option:

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --project <path>` | Target project path | Current working directory |

## Architecture

### Plan Lifecycle

```
DRAFT → DERIVED → VALIDATED → REVIEWED → HANDOFF_READY
```

| State | Trigger |
|-------|---------|
| `DRAFT` | Initial state after `plan create` |
| `DERIVED` | After `plan derive` produces `plan.yaml` |
| `VALIDATED` | After `plan validate` passes |
| `REVIEWED` | After `plan review` verdict is PASS or PASS_WITH_NOTES |
| `HANDOFF_READY` | After `plan checkpoint` creates handoff artifact |

### Artifact Structure

All artifacts live in `_ctx/plans/<plan-id>/` within each target project:

```
my-project/
├── _ctx/
│   └── plans/
│       └── my-feature/
│           ├── plan.md              # Human-authored source of truth
│           ├── plan.yaml            # Derived structured data
│           ├── validation-report.yaml
│           ├── review-report.md
│           └── .state.json          # Current lifecycle state
```

### Key Principles

- **`plan.md` is the single source of truth.** YAML is derived. If conflict, Markdown wins.
- **Fingerprint coherency.** Every derived artifact carries a SHA-256 fingerprint of its source. Mismatches are detected and rejected.
- **Drift detection.** If `plan.md` changes after derivation, the system archives stale plan.yaml, validation-report.yaml, and review-report.md to `history/` and resets to `DRAFT`. Checkpoints are not archived (v1 limitation).
- **Multi-project.** Operates on `cwd` by default; `--project <path>` overrides explicitly.
- **No execution.** Plans are consumed externally — the CLI produces, it does not run.

## Development

```bash
# Run in development mode (no build needed)
npm run dev -- create --id test-plan

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Lint
npm run lint

# Lint and fix
npm run lint:fix

# Format
npm run format

# Build
npm run build

# Run built CLI
npm start -- --help
```

### Stack

| Layer | Technology |
|-------|------------|
| Runtime | TypeScript + Node.js (ESM) |
| CLI | Commander.js |
| YAML | `yaml` package |
| Build | `tsc` |
| Dev | `tsx` |
| Test | Vitest + coverage-v8 |
| Lint/Format | Biome |

## Configuration

Global config lives at `~/.plan_dope/config/config.yml`. Per-project overrides via `.plan_dope.yml` in the project root.

```yaml
# ~/.plan_dope/config/config.yml
artifacts_base_path: _ctx
auto_derive: false
default_handoff_reason: transfer
```

## Shell Completions

Generate completion scripts for your shell:

```bash
# Bash
plan completion bash >> ~/.bash_completion

# Zsh
plan completion zsh >> ~/.zsh_completion

# Fish
plan completion fish > ~/.config/fish/completions/plan.fish
```

## License

MIT