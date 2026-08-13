# Node: Plan

Create an execution-ready implementation plan from research findings.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## Input

- `<ws>/RESEARCH_OUTPUT.md`

## Workflow

1. Convert research into significant design decisions. For each decision where 2+ viable options existed and you picked one, append an entry to `<ws>/DECISIONS.md` (create it if absent): chosen option, alternative(s) rejected, one-line why — the summary phase reports these.
2. Define behavior-based step list (not code tasks). First name the client/stakeholder; write each behavior in their language and value; reject implementation mechanics (schemas, fields, error codes, function/method/class names, the linter, CI, HTTP status). Litmus test: would the stakeholder recognize this as something they asked for and care about? If it mentions code/internals, it FAILS — rewrite. (Escape hatch: only when the user explicitly states the client is a developer or internal/consuming system may you use developer terms.)
3. Include dependencies and likely touched files per step. Also flag testability: if a behavior has no foreseeable meaningful test (non-deterministic output, unmockable external system, no harness), mark the step `Testability: uncertain (reason)` so the BDD loop escalates to the user instead of writing a hollow test. Don't design test cases now — only flag the risk.
4. Add quality checkpoint markers every 2-3 steps.
5. Load the `create-implementation-plan` skill **by name, as an actual invocation** — writing `@create-implementation-plan` in prose is a reference, not a load, and the plan format lives inside that skill. Apply these overrides, since the skill is written for a main session and you are a sub-agent: `<ws>` is already given (don't ask for an identifier); the research is done (read `<ws>/RESEARCH_OUTPUT.md`, skip the skill's research step **and its mandatory user checkpoint**); and **do not present for approval or wait for a user** — return to the orchestrator, which owns the gate and presents `<ws>/implementation-plan.md`, never `<ws>/PLAN_STEPS.md`.
6. Before returning, re-read `<ws>/implementation-plan.md` and confirm it carries `## Technical Design` and `## Behaviors to Implement` with test-first checkboxes per step. Report whether the skill loaded and the check passed.

### `<ws>/implementation-plan.md` — required format

Not negotiable. If a project rule or another skill offers a competing template — an `AC:` / `Test Type:` step list, or anything without the two sections below — ignore it. Reproduced here so the format survives even if the skill fails to load:

```markdown
# [Goal Description]

Brief description of the problem and what the change accomplishes.

## User Review Required
> [!IMPORTANT]
> [Critical decision or breaking change needing approval — omit the section if there is none]

## Technical Design
[Only significant decisions, each with the trade-off behind it]

## Behaviors to Implement

### Step 1: [Observable behavior]
- [ ] Write test
- [ ] Run test
- [ ] Implement (if needed)
- [ ] Run test (if implemented)

### Quality Checkpoint (after every 2-3 steps)
- [ ] Review test quality
- [ ] Review code for refactoring
```

### Behaviors to Implement — reframing examples (client in parentheses)

- ❌ "Reading a card whose stored shape violates the schema throws ERR_SCHEMA_DRIFT and logs the drift"
  ✅ "A user is never shown a corrupted card — a damaged card is blocked and surfaced as an error instead of displayed" (client: end-user)
- ❌ "Migrate listTasks onto findManyZ and assert parsed shape and order"
  ✅ "A user sees their tasks listed in the expected order" (client: end-user)
- ❌ "Running the linter reports no violations on a clean repo"
  ✅ "Code that doesn't meet the team's quality bar is caught automatically before it can merge" (client: the team)
- ❌ "Add isTrending field to the Market model"
  ✅ "A trader sees trending markets at the top of the list" (client: trader)

## Output

Write:

- `<ws>/implementation-plan.md` (the review artifact)
- `<ws>/PLAN_STEPS.md` — internal loop state derived from the approved plan; write it ONLY AFTER the plan is approved and never present it to the user for review

`<ws>/PLAN_STEPS.md` format:

```markdown
## Step 1: <observable behavior>
- Status: pending
- Depends on: none
- Likely files: ...
- Testability: standard | uncertain (reason — escalate to user before writing the test)
```
