
# TDD Guidelines

Test-Driven Development: write tests before implementation using red-green-refactor cycle.

## Core Principles

1. **Red-Green-Refactor** - Write failing test (Red), make it pass (Green), improve code (Refactor)
2. **Test First** - Always write the test before behavior logic (structural scaffolding may come first — see Meaningful Red)
3. **One Test at a Time** - One test → MUST run it and see the result → make it pass → next test
4. **Meaningful Red** - A red run only counts when the test fails on a behavior assertion; structural failures (404 route not registered, missing field/column/import) validate nothing. Scaffold the structure the test touches (route, empty handler, field, empty function returning a default) before running so the only possible failure is behavioral — scaffolding contains no behavior logic. If the minimal scaffolding already IS the implementation (trivial pass-through, static field), write just enough code to pass first and expect green from the first run — state this explicitly; never manufacture a useless red just to follow ritual.
5. **Minimum Implementation** - Only code needed to make test pass
6. **Test Quality** - Follow 4 Pillars of Testing (Reliability, Validity, Sensitivity, Resilience)


## TDD vs BDD — when to use which

- **BDD = outer loop.** Drive user-facing feature behavior with scenarios written as Given/When/Then. This is the default framing for feature development.
- **TDD = inner loop.** Drive internal logic, algorithms, and utilities underneath a BDD scenario.
- **Both share the same discipline:** the test-run GATE (write the test and run it before writing behavior logic) and one-at-a-time (one BDD scenario / one TDD test, run it, see a meaningful result — real red, or expected green when no real red is possible — then next). Test-first applies to both — BDD is also test-first.

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

