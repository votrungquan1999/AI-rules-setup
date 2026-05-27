---
name: tdd-design
description: Apply strict red-green-refactor cycles with one-test-at-a-time execution. Use when implementing logic incrementally with strong safety and feedback loops.
---

# TDD Design

Implement with a strict test-first loop.

## Core Loop

1. Write exactly one test.
2. Run it before implementation.
3. Implement minimum code to pass.
4. Re-run test and confirm green.
5. Refactor only when tests remain green.

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

- Do not write implementation before test execution.
- Do not batch several tests before coding.
- Use project-defined test commands from `package.json` when available.
