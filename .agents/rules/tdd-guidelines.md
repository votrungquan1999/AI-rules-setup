
# TDD Guidelines

Test-Driven Development: write tests before implementation using red-green-refactor cycle.

## Core Principles

1. **Red-Green-Refactor** - Write failing test (Red), make it pass (Green), improve code (Refactor)
2. **Test First** - Always write the test before behavior logic (structural scaffolding may come first — see Meaningful Red)
3. **One Test at a Time** - One test → MUST run it and see the result → make it pass → next test
4. **Meaningful Red** - A red run only counts when the test fails on a behavior assertion; structural failures (404, missing route/field/import) validate nothing. Scaffold the structure the test touches (route, field, empty handler returning a default — no behavior logic) before running, so the only possible failure is behavioral
5. **Minimum Implementation** - Only code needed to make test pass
6. **Test Quality** - Follow 4 Pillars of Testing (Reliability, Validity, Sensitivity, Resilience)

**When no meaningful red is possible** — the minimal scaffolding needed to avoid a structural failure already IS the implementation (trivial pass-through, static field) — write just enough code to pass first and expect **green from the first run**. State this explicitly. Never manufacture a useless red just to follow the ritual.


## Test Quality Checklist

**4 Pillars:**

- **Reliability** - Consistent results, no flaky tests, mock external dependencies
- **Validity** - Verify intended behavior, specific assertions, all execute
- **Sensitivity** - Detect defects, specific assertions, test edge cases
- **Resilience** - Survive refactoring, test through public interfaces

**Code Quality:**

- ✅ All tests pass
- ✅ Linting passes
- ✅ Follows conventions

