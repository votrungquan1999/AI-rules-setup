---
name: create-implementation-plan
description: Create a focused implementation plan with significant design decisions and the observable behaviors to build. Use before non-trivial implementation work.
---

# Create Implementation Plan

Plan first for medium/large tasks so implementation stays predictable.

## When to Use

- Changes span multiple files/systems.
- Requirements include edge-case or architectural choices.
- Refactor/feature touches existing critical behavior.

## Workflow

0. **Establish the task workspace (before writing any notes or the plan).** If a caller gave you a working directory (e.g. the orchestrator passes `<ws>` = `./tmp/<identifier>/`), use it. Otherwise ask the user for a **task identifier** — a ticket id (e.g. `JIRA-123`) or any short label; if they have none, derive a short kebab-case slug and **confirm it**. Then `<ws>` = `./tmp/<identifier>/` (create it). Scoping artifacts under `./tmp/<identifier>/` lets multiple planning tasks coexist without overwriting each other. All artifact paths below are relative to `<ws>`. **Before creating `<ws>` or writing, check whether it already holds artifacts from unrelated work — if so, STOP and ask the user how to proceed; never overwrite another task's artifacts.**
1. Research relevant code paths and current patterns.
2. Ask clarifying questions for gaps.
3. Define significant design decisions only:
   - data/API shape changes
   - strategy choices and tradeoffs
   - risk areas
4. Convert scope into observable behaviors:
   - **Identify the client first.** Name the client/stakeholder of the feature before listing any behavior. By default this is a business or end-user stakeholder.
   - **Business/end-user language is the default.** Frame each behavior as an outcome that stakeholder would recognize and care about, in their words, traced to value. No implementation mechanics: a behavior must NOT name schemas, fields, tables, queries, error codes, function/method/class names, the linter, CI, or HTTP status.
   - **Litmus test:** Read the behavior aloud to the stakeholder. Would they recognize it as something they asked for and care about? If it mentions code or internal mechanics, it FAILS — rewrite before proceeding.
   - **Escape hatch:** ONLY when the user explicitly states the client is a developer or an internal/consuming system (e.g. a library/API contract) may you phrase behaviors in developer terms. Otherwise, always trace to business/end-user value.

   Reframing examples (client in parentheses):
   - ❌ "Reading a card whose stored shape violates the schema throws ERR_SCHEMA_DRIFT and logs the drift"
     ✅ "A user is never shown a corrupted card — a damaged card is blocked and surfaced as an error instead of displayed" (client: end-user)
   - ❌ "Migrate listTasks onto findManyZ and assert parsed shape and order"
     ✅ "A user sees their tasks listed in the expected order" (client: end-user)
   - ❌ "Running the linter reports no violations on a clean repo"
     ✅ "Code that doesn't meet the team's quality bar is caught automatically before it can merge" (client: the team)
   - ❌ "Add isTrending field to the Market model"
     ✅ "A trader sees trending markets at the top of the list" (client: trader)

   **A behavior is the unit of planning, acceptance and commit:** one heading in the client's language, with its own acceptance check. **Steps** are the ordered technical work inside one behavior, numbered under it (`Step 2.1`, `Step 2.2`), with a test run wherever it gates the next step. Most behaviors need no steps beyond the default test-first cycle — add steps only when one needs several changes (a query rewrite plus an index, a migration plus a backfill).

   **Behavior check — run it on every heading before the plan is presented.** A heading that fails is a step, or belongs elsewhere:
   - **No acceptance check of its own, or only makes sense after the heading before it** → a step inside the behavior it serves.
   - **Setup or groundwork** (a test harness, config or flag removal, a migration, a refactor that only enables new work) → steps of the first behavior that needs it; cleanup goes in the behavior that makes the old code dead.
   - **"Still works as before" inside a feature** → not a behavior; name the existing suites that pin it in the step that risks it, and add a pin test only where nothing covers the path.
   - **Comes from the code, not the request** → a note in the behavior that covers it, or a question for the user.
   - **Two outcomes the client would check separately** → split them. **One outcome split across headings by technical step** → merge them.
   - **Only verifies other behaviors** (an end-to-end run, a speed check across several) → `### Final check`: checks only, never code changes.

   **Acceptance — exactly one mode per behavior:**
   1. **New behavior** (default) — a new test runs red, then green after the implementation.
   2. **Trivial** — green from the first run; no meaningful red is possible.
   3. **Unchanged outcome under a risky change** (refactor, performance, migration, upgrade) — only when the request changes *how* something works, not *what* the client sees. Pin today's behavior with a test green before the change and after; when existing suites already pin it, name them and write no new test. Measure a non-functional goal (speed, memory) before and after, inside the behavior.

   Only mode 3 gets an `**Acceptance:**` line in the plan.
5. Include a test strategy for each behavior.
6. Present `<ws>/implementation-plan.md` (the rich plan document with Technical Design + Behaviors) for review and wait for approval before coding. This document — NOT any derived steps file — is what the user reviews. The steps file (`<ws>/PLAN_STEPS.md`) is a derived workflow-state artifact that the BDD scenario loop consumes; write it ONLY AFTER the plan is approved, and never ask the user to review it.

## Output Shape

```markdown
## Goal
## Technical Design Decisions
## Behaviors to Implement

### Behavior 1: [Observable behavior]
- [ ] Write test
- [ ] Run test
- [ ] Implement (if needed)
- [ ] Run test (if implemented)

### Behavior 2: [Observable behavior that needs several changes]
- [ ] Write test
- [ ] Run test
- [ ] Step 2.1: [first technical change]
- [ ] Step 2.2: [next technical change]
- [ ] Run test

### Behavior 3: [Outcome that must not change, plus the goal — e.g. "… the same results, faster"]
**Acceptance:** unchanged outcome — pinned by [named suites | a new pin test]; [metric] before → after
- [ ] Pin: run it green on today's code; measure [metric]
- [ ] Step 3.1: [technical change] — run the pin, still green
- [ ] Measure [metric] again

### Quality Checkpoint (after every 2-3 behaviors)
- [ ] Review test quality
- [ ] Review code for refactoring

### Final check
- [ ] [A check that spans several behaviors — an end-to-end run, a speed check]

## Risks / Open Questions
```

Behaviors 2-3 show the other shapes — use them only when needed; a plain feature uses the first shape throughout. Omit `### Final check` when no check spans several behaviors.

## Guardrails

- Do not list low-level coding minutiae as "design."
- Do not start implementation before user confirms the plan.
- Surface assumptions explicitly.
