---
name: bdd-design
description: Design and implement behavior with scenario-first BDD loops. Use when building user-facing features, acceptance criteria, and behavior-level tests.
---

# BDD Design

Define behavior first, then implement code that satisfies those behaviors.

## When to Use

- User-facing features with clear business outcomes.
- Acceptance-test oriented development.
- Cases where shared domain language matters.

## Workflow

1. Clarify requirements before writing scenarios:
   - scope and out-of-scope
   - user roles
   - edge/error behavior
2. Write behavior scenarios:
   - Setup
   - Action
   - Assert
3. Implement one scenario at a time:
   - write one behavior test
   - run test before implementation
   - implement minimal code
   - run test again and verify
4. Repeat for next behavior.

## Scenario Guidelines

- One scenario = one observable behavior.
- Use domain language, not implementation detail.
- Cover happy path, edge cases, and failure paths.

## Guardrails

- Do not batch multiple behaviors into one step.
- Do not implement before executing the scenario test.
- If requirements are unclear, ask first instead of assuming.
