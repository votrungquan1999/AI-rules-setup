---
name: create-implementation-plan
description: Creates a focused implementation plan with technical design decisions and behavior-based test scenarios before execution.
---

# Create Implementation Plan

Structured approach to creating a focused implementation plan before execution. The plan captures **what matters most**: significant design decisions and the observable behaviors to test — nothing else.

## Purpose

Ensures significant changes are well-thought-out and reviewed before implementation begins. Prevents wasted effort from poor planning.

## When to Use This Skill

- Implementing a new feature or significant change
- Planning a refactor or architectural update
- Working on changes that span multiple files or components
- Need to communicate your approach to stakeholders

## Instructions

### Step 1: Research the Codebase

**Goal:** Understand the existing implementation before planning.

Read as many relevant files as possible to understand:
- Existing patterns and conventions in the codebase
- Related features or components that might be affected
- Architecture and structure of the area you'll be modifying
- Testing patterns and utilities already in place
- Types, interfaces, and data models

**Fundamental Rule: Ask, Don't Assume.**
Never assume when you could ask. A wrong assumption invalidates the entire plan. Every unconfirmed assumption is a risk.

**Requirement Clarification — mandatory before planning.** If *anything* is unclear or ambiguous, stop and ask. Specifically:
- **What** should be built: exact behavior, scope boundaries, user-facing vs internal
- **Why** it's needed: reveals hidden constraints and priorities
- **How** edge cases should behave: error states, empty states, boundary conditions
- **What's explicitly out of scope**: don't guess, always confirm
- **Any assumption you're tempted to make**: state it explicitly and ask the user to confirm or correct it

Do not fill in gaps with "reasonable" guesses. Do not assume implementation details, technology choices, or architectural direction. Ask.

When researching external libraries or APIs, use `@context7` for documentation queries and `@web-search` for broader research.

**Mandatory Checkpoint:** After reading files, summarize what you found and list any remaining open questions. Ask the user explicitly:
- Are there more files to read?
- Are there open questions to resolve?
- Should we continue to planning?

**CRITICAL: You MUST stop execution here and wait.** Do not proceed to Step 2 or start writing the plan until the user explicitly says "continue with implementation plan" or "continue". Answer any user questions during this pause.

### Step 2: Analyze Requirements

- Clarify the goal and success criteria
- Identify edge cases and constraints
- Determine scope boundaries (what's in/out of scope)
- List assumptions and unknowns
- Identify dependencies (external APIs, libraries, other features)

### Step 3: Design the Approach

Focus only on **significant** design decisions — things that are non-obvious, introduce new concepts, or require deliberate choices. Skip general implementation details that follow naturally from existing patterns.

Document:
- Key architectural decisions and why (e.g., new data models, significant new fields, API contract changes, strategy choices)
- Trade-offs considered for non-trivial decisions
- Breaking changes (API, config, behavior)
- Areas of uncertainty or risk

Use GitHub alerts (`IMPORTANT`/`WARNING`/`CAUTION`) for critical decisions needing user input.

For complex designs, consider using the `@structured-brainstorming` workflow to explore alternatives.

**Do NOT list every file that will change or describe every function.** Only capture decisions that a reviewer needs to understand the approach.

### Step 4: Define Observable Behaviors & Test Cases

List the behaviors the system should exhibit, ordered by implementation priority. Each behavior becomes one BDD scenario step — a strictly isolated test-first cycle.

**CRITICAL: ONE TEST AT A TIME**
Never batch behaviors or write multiple tests at once. Each step must be exactly one behavior, which translates to exactly one test, followed immediately by its implementation.

**Identify the client first.** Before listing any behavior, name the client/stakeholder of the feature. By DEFAULT this is a business or end-user stakeholder — frame every behavior as an outcome they would recognize and care about, in their words, traced to value. ONLY when the user explicitly states the client is a developer or an internal/consuming system (e.g. a library/API contract) may you phrase behaviors in developer terms.

Each behavior must be:
- **Observable** — something a user or system can verify externally
- **In the client's language** — the outcome the stakeholder sees, NOT implementation mechanics (no schemas, fields, tables, queries, error codes, function/method/class names, the linter, CI, HTTP status)
- **Not a code task** — describe what the system does, not how

**Litmus test:** Read the behavior aloud to the stakeholder. Would they recognize it as something they asked for and care about? If it mentions code or internal mechanics, it FAILS — rewrite before proceeding.

> ✅ `User sees trending markets at the top of the list`
> ✅ `Valid inputs are persisted to the standard settings`
> ✅ `Markets with score below threshold are excluded from trending`
> ❌ `Add isTrending field to Market model` → ✅ `A trader sees trending markets at the top of the list` (client: trader)
> ❌ `Reading a card whose stored shape violates the schema throws ERR_SCHEMA_DRIFT and logs the drift` → ✅ `A user is never shown a corrupted card — a damaged card is blocked and surfaced as an error instead of displayed` (client: end-user)
> ❌ `Migrate listTasks onto findManyZ and assert parsed shape and order` → ✅ `A user sees their tasks listed in the expected order` (client: end-user)
> ❌ `Running the linter reports no violations on a clean repo` → ✅ `Code that doesn't meet the team's quality bar is caught automatically before it can merge` (client: the team)
> ❌ `Add StandardSettings interface to types file`
> ❌ `Write SQL query for trending markets`

For each behavior, plan the test-first cycle:
```markdown
### [Observable behavior]
- [ ] Write test
- [ ] Run test
- [ ] Implement (if needed)
- [ ] Run test (if implemented)
```

Group quality checkpoints after every 2-3 behaviors:
```markdown
### Quality Checkpoint
- [ ] Review test quality
- [ ] Review code for refactoring
```

### Step 5: Write the Plan Document

Write to `<appDataDir>/brain/<conversation-id>/implementation-plan.md` using this format:

```markdown
# [Goal Description]

Brief description of the problem and what the change accomplishes.

## User Review Required

> [!IMPORTANT]
> [Critical decision or breaking change that needs approval]

## Technical Design

[Only significant decisions. e.g.:]
- **New `score` field on `Market`**: Stored as float, computed at read time from engagement stats. Not persisted — avoids write amplification.
- **Trending threshold**: Configured via env var `TRENDING_MIN_SCORE` (default: 0.7) rather than hardcoded, to allow tuning without deploy.
- **Strategy choice**: Using a view instead of a materialized view — latency acceptable, avoids refresh complexity.

## Behaviors to Implement

### Step 1: [Observable behavior]
- [ ] Write test
- [ ] Run test
- [ ] Implement (if needed)
- [ ] Run test (if implemented)

### Step 2: [Observable behavior]
- [ ] Write test
- [ ] Run test
- [ ] Implement (if needed)
- [ ] Run test (if implemented)

### Quality Checkpoint (after every 2-3 steps)
- [ ] Review test quality
- [ ] Review code for refactoring
```

### Step 6: Request Review

**MUST pause for user review.** Use `notify_user` to request approval before any implementation begins.

**What the user reviews:** Present the **implementation plan document** (`implementation-plan.md`) — the rich plan containing **Technical Design** + **Behaviors to Implement**. This document is the review artifact.

**NEVER present a steps file for review.** A bare step list (the derived workflow-state artifact consumed by the BDD scenario loop) is NOT what the user reviews. Write any such steps file ONLY AFTER the plan is approved, and do not ask the user to review it.

---

## Best Practices

- ✅ Ask clarifying questions before planning — surface every assumption you're tempted to make
- ✅ Capture decisions that require deliberate thought or trade-offs
- ✅ Write behaviors as observable outcomes, not code tasks
- ✅ Use mermaid diagrams for complex architecture
- ✅ Highlight breaking changes and decisions needing user input
- ❌ Don't assume anything that isn't explicitly stated — ask instead
- ❌ Don't infer scope or requirements from similar past work — confirm
- ❌ Don't list every file that will be touched
- ❌ Don't describe implementation details that follow obviously from existing patterns
- ❌ Don't add a verification plan — test-first development verifies as you go
- ❌ Don't skip the research phase

## Related Skills

- `@structured-brainstorming` - Use for complex design decisions during Step 3
