# Testing

Testing strategy and patterns specific to this project.

**Related:** [Architecture](./architecture.md) · [Patterns](./patterns.md)

## Test Infrastructure

- **Framework:** Vitest
- **React Testing:** `@testing-library/react` + `jsdom` environment
- **Config:** 60s test timeout, single fork for stability

## Two Test Suites

### Unit / Integration Tests (`vitest.config.ts`)

- **Environment:** `jsdom` (supports React component testing)
- **Includes:** Everything under `tests/` except `tests/e2e/`
- **Setup:** `tests/setup.ts`
- **Run:** `npm test` or `npx vitest run`

Covers:
- CLI command logic (add, init, pull)
- Library functions (search, command-generator, config, file operations)
- Web UI components (rule selection, agent switching, command display)
- Question generation utilities

### E2E Tests (`vitest.e2e.config.ts`)

- **Environment:** `node` (no DOM)
- **Includes:** Only `tests/e2e/**/*.test.ts`
- **Setup:** `tests/e2e/setup.ts`
- **Requires:** API server running (`npm run dev:api`)
- **Run:** `npm run test:e2e` or `npm run test:e2e -- tests/e2e/specific.test.ts`

Covers:
- Full init/pull/add flows against real API server
- End-to-end content installation verification

## Running Tests

```bash
# Unit/integration tests (no API server needed)
npm test

# E2E tests (API server must be running)
npm run dev:api   # Terminal 1
npm run test:e2e  # Terminal 2
```

> **Note:** Always run tests without watch mode in agent terminals — watch mode hangs in non-interactive shells. Use `npx vitest run` instead of `npx vitest`.

## Testing Patterns

### Cache Injection for CLI Tests
The API client exposes `setCachedRules()` and `resetCache()` for injecting test data:

```typescript
import { setCachedRules, resetCache } from "src/cli/lib/api-client";

beforeEach(() => {
  setCachedRules(testFixture);
});
afterEach(() => {
  resetCache();
});
```

## Test Organization

```
/tests
  /commands          # CLI command tests (add, init, pull)
  /init              # Init-specific test scenarios
  /lib               # Library function tests
  /select-rules      # Web UI component tests
  /e2e               # End-to-end tests (separate config)
  /fixtures          # Test data and mock files
  /helpers           # Shared test utilities
  /scripts           # Test scripts
  setup.ts           # Global test setup (unit/integration)
```
