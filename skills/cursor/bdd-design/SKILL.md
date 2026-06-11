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
   - scaffold the structure the test touches (register the route, add the field, empty handler returning a default) — no behavior logic
   - run test before writing behavior logic — a valid red fails on the behavior assertion; a structural error (404, missing route/field) validates nothing, fix the scaffolding and run again
   - implement minimal code
   - run test again and verify
4. Repeat for next behavior.

**When no meaningful red is possible** — the minimal scaffolding needed to avoid a structural failure already IS the implementation (e.g., a trivial pass-through, a field that just renders) — write just enough code to pass first and expect **green from the first run**. State this explicitly; never manufacture a useless red.

## Core Principles

- **Client's Language First.** Name the client/stakeholder before listing any behavior (by default a business or end-user stakeholder), then frame every behavior as an outcome that stakeholder would recognize and care about, in their words. Tie it to value: "As a [stakeholder], I want [capability], So that [value]".
- One scenario = one observable behavior.
- Cover happy path, edge cases, and failure paths.

## Write Behaviors in the Client's Language

- **Identify the client first.** By default this is a business or end-user stakeholder.
- **Business/end-user language is the default.** No implementation mechanics in a behavior — it must NOT name code artifacts or internals: schemas, fields, tables, queries, error codes, function/method/class names, the linter, CI, HTTP status, etc. If it does, it is at the wrong altitude — rewrite it as the outcome the stakeholder sees.
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

## Scenario Guidelines

- One scenario = one observable behavior.
- Use domain language, not implementation detail.
- Cover happy path, edge cases, and failure paths.

## Guardrails

- Does every scenario read in the client's language (no code/internals)? If not, rewrite before implementing.
- Do not batch multiple behaviors into one step.
- Do not write behavior logic before executing the scenario test (structural scaffolding is allowed and encouraged).
- Do not treat a structural failure (404, missing route/field) as a valid red.
- If requirements are unclear, ask first instead of assuming.
