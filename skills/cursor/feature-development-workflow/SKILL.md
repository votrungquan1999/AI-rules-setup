---
name: feature-development-workflow
description: Execute feature delivery with context gathering, plan-first development, test-first implementation, and quality gates. Use for medium/large features or multi-file tasks.
---

# Feature Development Workflow

Build features incrementally with explicit planning and verification.

## When to Use

- User asks to implement a non-trivial feature.
- Work spans multiple files or systems.
- Requirements or tradeoffs need validation.

## Core Principles

1. Context first.
2. Plan before implementation.
3. Test behavior, not internals.
4. Ship in small, verifiable steps.

## Workflow

### Phase 1: Context and Clarification

1. Read relevant code paths and existing patterns.
2. Clarify ambiguous requirements before coding.
3. Confirm scope and acceptance criteria.

### Phase 2: Plan

1. Create a short implementation plan with ordered steps.
2. Include risk notes and test strategy per step.
3. Get user confirmation when plan materially changes behavior.

### Phase 3: Implement Incrementally

For each step:

1. Define behavior scenario(s).
2. Write or update tests.
3. Run tests to validate failure/pass states as needed.
4. Implement minimal code to satisfy behavior.
5. Re-run tests and quick lint/type checks.
6. Move to next step only when current step is stable.

### Phase 4: Quality Gate

After every 2-3 steps:

- Review test quality and coverage gaps.
- Refactor only where it improves clarity/safety.
- Re-verify before continuing.

## Suggested Progress Format

```markdown
## Step N: <behavior>
- Status: In progress | Done
- Tests: <new/updated tests>
- Notes: <important choices or risks>
```

## Guardrails

- No large speculative refactors mid-feature.
- No skipping tests for behavior-changing code.
- Keep scope aligned with user-approved plan.
