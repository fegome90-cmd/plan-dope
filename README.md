# plan_dope

CLI para la planificación supervisada de desarrollo técnico.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-ESM-green.svg)](https://nodejs.org/)
![Tests](https://img.shields.io/badge/Tests-74%2F74-brightgreen.svg)
[![Biome](https://img.shields.io/badge/code%20style-biome-60a5fa.svg)](https://biomejs.dev/)

## Purpose

`plan_dope` es un CLI de planificación supervisada donde el humano
trabaja sobre `plan.md`, y el sistema deriva estructura YAML, valida
consistencia, revisa calidad y produce handoffs transferibles.

**No ejecuta trabajo técnico.** Produce artefactos de planificación que
otros sistemas consumen. El humano es autor y criterio final en cada ciclo.

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
| `plan observe` | Agrega notas manuscritas o correcciones formales referenciando hallazgos | `[plan-id]`, `--comment <text>`, `--correct <text>`, `--finding <ref>` |
| `plan close` | Sella la iteración actual moviéndola a `/history` | `[plan-id]` |
| `plan checkpoint` | Exporta un nodo de entrega (handoff). Fuera del alcance efectivo de Fase B v1. | `--plan-id <plan-id>`, `--project <path>`, `--reason <pause\|transfer\|completion>` |
| `plan wizard` | Interactive pipeline: create → derive → validate → review → checkpoint | `--project <path>` |
| `plan completion` | Generate shell completion script | `<bash\|zsh\|fish>` |

> **Nota de Diseño v1 (Compatibilidad vs. Ergonomía)**:
> Por cuestiones histórico-ergonómicas del CLI actual:
> - Los comandos automáticos `create`/`derive`/`validate`/`review` /`checkpoint` requieren bandera estricta `--plan-id` o `--id`.
> - Los comandos interactivos-humanos `observe` y `close` toleran ID posicional (`plan close <id>`).
> - Los directorios `history/cycle-<N>/` albergan una versión inmutable transaccional *por contrato semántico de comandos*, sin mecanismos restrictivos a nivel low-level de filesystem o permisos OS.

### Common Options

All commands (except `completion`) support the following option:

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --project <path>` | Target project path | Current working directory |

## Architecture

See [ARCHITECTURE-v1.md](./ARCHITECTURE-v1.md) for full details.

**Core idea**: `plan.md` is the single source of truth. The system derives
YAML, validates structure, reviews quality, and produces handoffs.
Each pipeline stage is re-runnable as the plan evolves.

| State | Meaning |
|-------|---------|
| `DRAFT` | Plan in progress |
| `DERIVED` | YAML generated |
| `VALIDATED` | YAML verified |
| `REVIEWED` | Review passed |
| `HANDOFF_READY` | Checkpoint emitted |

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

Global config at `~/.plan_dope/config/config.yml`. See
[ARCHITECTURE-v1.md](./ARCHITECTURE-v1.md) for configuration details.

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

