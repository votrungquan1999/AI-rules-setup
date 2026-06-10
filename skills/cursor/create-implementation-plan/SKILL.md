---
name: create-implementation-plan
description: Create a focused implementation plan with significant design decisions and behavior-based execution steps. Use before non-trivial implementation work.
---

# Create Implementation Plan

Plan first for medium/large tasks so implementation stays predictable.

## When to Use

- Changes span multiple files/systems.
- Requirements include edge-case or architectural choices.
- Refactor/feature touches existing critical behavior.

## Workflow

0. **Establish the task workspace (before writing any notes or the plan).** If a caller gave you a working directory (e.g. the orchestrator passes `<ws>` = `./tmp/<identifier>/`), use it. Otherwise ask the user for a **task identifier** — a ticket id (e.g. `JIRA-123`) or any short label; if they have none, derive a short kebab-case slug and **confirm it**. Then `<ws>` = `./tmp/<identifier>/` (create it). Scoping artifacts under `./tmp/<identifier>/` lets multiple planning tasks coexist without overwriting each other. All artifact paths below are relative to `<ws>`.
1. Research relevant code paths and current patterns.
2. Ask clarifying questions for gaps.
3. Define significant design decisions only:
   - data/API shape changes
   - strategy choices and tradeoffs
   - risk areas
4. Convert scope into behavior-based implementation steps (define observable behaviors):
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
5. Include a test strategy for each step.
6. Present `<ws>/implementation-plan.md` (the rich plan document with Technical Design + Behaviors) for review and wait for approval before coding. This document — NOT any derived steps file — is what the user reviews. The steps file (`<ws>/PLAN_STEPS.md`) is a derived workflow-state artifact that the BDD scenario loop consumes; write it ONLY AFTER the plan is approved, and never ask the user to review it.

## Output Shape

```markdown
## Goal
## Technical Design Decisions
## Behaviors to Implement
## Risks / Open Questions
```

## Guardrails

- Do not list low-level coding minutiae as "design."
- Do not start implementation before user confirms the plan.
- Surface assumptions explicitly.
