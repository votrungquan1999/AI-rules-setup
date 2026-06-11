---
name: tdd-design
description: Inner-loop helper for unit-level/algorithm development. Apply strict red-green-refactor cycles with one-test-at-a-time execution WITHIN a single BDD scenario step (not the feature workflow's default loop). Use to drive internal logic, algorithms, or utilities when a scenario needs fine-grained test-first coverage.
---

# TDD Design

Implement with a strict test-first loop.

## Core Loop

1. Write exactly one test.
2. Scaffold the structure the test touches (empty function/exported stub returning a default) so the run can only fail on the behavior assertion — scaffolding contains no behavior logic.
3. Run it before writing behavior logic. A structural failure (import error, undefined function, missing export) is NOT a valid red — fix the scaffolding and run again.
4. Implement minimum code to pass.
5. Re-run test and confirm green.
6. Refactor only when tests remain green.

**When no meaningful red is possible** — the minimal scaffolding needed to avoid a structural failure already IS the implementation (trivial pass-through, static value) — write just enough code to pass first and expect **green from the first run**. State this explicitly; do not manufacture a useless red.

## When to Use

- New logic with uncertain edge cases.
- Bug fixes that need regression protection.
- Refactors that require safety nets.

## Test Quality Focus

- Reliability: deterministic, isolated tests.
- Validity: assertions prove intended behavior.
- Sensitivity: tests fail for real defects.
- Resilience: avoid brittle coupling where possible.

## Guardrails

- Do not write behavior logic before test execution (structural scaffolding is allowed and encouraged).
- Do not treat a structural failure as a valid red — only a failing behavior assertion validates anything.
- Do not batch several tests before coding.
- Use project-defined test commands from `package.json` when available.
