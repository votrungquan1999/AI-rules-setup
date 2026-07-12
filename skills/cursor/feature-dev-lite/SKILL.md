---
name: feature-dev-lite
description: Single-session feature delivery — context gathering, plan-first development, test-first implementation, and quality gates. Use for small-to-medium features or multi-file tasks you're building solo in one pass.
---

# Feature Dev Lite

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

### Phase 0: Establish the Task Workspace

**Before writing any notes, plan, or progress file:**

- If a caller gave you a working directory (e.g. the orchestrator passes `<ws>` = `./tmp/<identifier>/`), use it.
- Otherwise, ask the user for a **task identifier** — a ticket id (e.g. `JIRA-123`) or any short label; if they have none, derive a short kebab-case slug and **confirm it**. Then `<ws>` = `./tmp/<identifier>/` (create it).

`<ws>` is that working directory. Write the plan and progress file (e.g. `<ws>/IMPLEMENTATION_PROGRESS.md`) under it so multiple tasks run in parallel without colliding. **Before creating `<ws>` or writing, check whether it already holds artifacts from unrelated work — if so, STOP and ask the user how to proceed; never overwrite another task's artifacts.**

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
2. Write ONE test at a time.
3. Scaffold the structure the test touches (route, field, empty handler returning a default) — no behavior logic.
4. Run the test before writing behavior logic — expect a failure on the behavior assertion. A structural error (404, missing field, import error) is NOT a valid red; fix the scaffolding and re-run. If no meaningful red is possible (the scaffolding IS the implementation), write just enough code to pass first and expect green from the first run — note this explicitly.
5. Implement minimal code to satisfy behavior.
6. Re-run tests and quick lint/type checks.
7. Move to next step only when current step is stable.

### Phase 4: Quality Gate

After every 2-3 steps:

- Review test quality and coverage gaps.
- Refactor only where it improves clarity/safety.
- Re-verify before continuing.

## Suggested Progress Format

Write progress to `<ws>/IMPLEMENTATION_PROGRESS.md`:

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
