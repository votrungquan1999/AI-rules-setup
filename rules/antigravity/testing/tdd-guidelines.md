
# TDD Guidelines

Test-Driven Development: write tests before implementation using red-green-refactor cycle.

## Core Principles

1. **Red-Green-Refactor** - Write failing test (Red), make it pass (Green), improve code (Refactor)
2. **Test First** - Always write tests before implementation
3. **One Test at a Time** - One test → MUST run test to see it fail → make it pass → next test
4. **Minimum Implementation** - Only code needed to make test pass
5. **Test Quality** - Follow 4 Pillars of Testing (Reliability, Validity, Sensitivity, Resilience)


## TDD vs BDD — when to use which

- **BDD = outer loop.** Drive user-facing feature behavior with scenarios written as Given/When/Then. This is the default framing for feature development.
- **TDD = inner loop.** Drive internal logic, algorithms, and utilities underneath a BDD scenario.
- **Both share the same discipline:** the test-run GATE (run the test before implementing) and one-at-a-time (one BDD scenario / one TDD test, see it fail, make it pass, then next). Test-first applies to both — BDD is also test-first.

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

