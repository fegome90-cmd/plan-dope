# Contributing to plan_dope

## Development Environment Setup

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 22+ (ESM) |
| npm | any |
| Git | required (plans live in git repos) |

### Install

```bash
git clone https://github.com/fegome90-cmd/plan-dope.git
cd plan-dope
npm install
```

## Available Scripts

<!-- AUTO-GENERATED: scripts table -->

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Run in development mode with tsx (no build needed) |
| `npm run start` | Run built CLI from dist/ |
| `npm test` | Run test suite with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint source with Biome |
| `npm run lint:fix` | Lint and auto-fix with Biome |
| `npm run format` | Format source with Biome |
| `npm run typecheck` | Type check without emitting files |

<!-- /AUTO-GENERATED -->

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for TDD)
npm run test:watch
```

### Writing Tests

Tests live in `tests/index.test.ts`. The project uses Vitest with a shared temp directory per test.

**Pattern**: Each test creates an isolated temp directory with `git init` in `beforeEach`, and cleans up in `afterEach`.

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

let tmpDir: string;

beforeEach(() => {
  tmpDir = join('/tmp', `plan-dope-test-${randomBytes(4).toString('hex')}`);
  mkdirSync(tmpDir, { recursive: true });
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('feature', () => {
  it('does something', async () => {
    // Test core functions directly
    const result = await someFunction(tmpDir);
    expect(result).toBeDefined();
  });
});
```

**Testing core functions**: Import from `../src/core/*.js` and call directly.
**Testing CLI commands**: Commands now accept opts directly — test the core functions, not the command wrappers.

## Code Style

- **Formatter**: Biome (2-space indent, single quotes, semicolons always, 100 char line width)
- **Linter**: Biome with recommended rules + `noUnusedVariables: error`, `noUnusedImports: error`
- **TypeScript**: strict mode, ESM modules with `.js` extensions in imports
- **Node.js imports**: Use `node:` protocol for built-in modules (`node:fs`, `node:path`, etc.)
- **Type-only imports**: Use `import type { ... }` for type-only imports

### Pre-commit Checklist

- [ ] `npm run lint` passes (0 warnings, 0 errors)
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (all tests green)
- [ ] `npm run build` succeeds
- [ ] No unused imports or variables
- [ ] `node:` protocol used for Node.js built-in imports
- [ ] `import type` used for type-only imports

## Project Structure

```
src/
├── cli.ts              # Command registration (lazy-loaded)
├── commands/           # CLI command definitions
│   ├── create.ts
│   ├── derive.ts
│   ├── validate.ts
│   ├── review.ts
│   ├── checkpoint.ts
│   └── wizard.ts
├── core/               # Business logic
│   ├── resolver.ts     # Project root resolution + git validation
│   ├── create.ts       # Plan.md generation
│   ├── derive.ts       # Plan.yaml derivation + drift detection
│   ├── validate.ts     # Plan.yaml validation
│   ├── review.ts       # Plan review + verdict
│   ├── checkpoint.ts   # Handoff artifact generation
│   ├── state.ts        # State machine + transitions
│   ├── git.ts          # Git repo validation
│   └── config.ts       # Global + project config resolution
└── types/
    └── index.ts        # Canonical domain types
tests/
└── index.test.ts       # All tests (74)
```

## Pull Request Submission

1. Create a feature branch from `main`
2. Make changes following the code style above
3. Ensure all gates pass (`lint`, `typecheck`, `test`, `build`)
4. Push and open a PR with:
   - Description of what changed
   - Why the change was needed
   - Any breaking changes (flag them clearly)
