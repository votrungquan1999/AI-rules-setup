# Node: Plan

Create an execution-ready implementation plan from research findings.

## Input

- `tmp/orchestrated-feature-dev/RESEARCH_OUTPUT.md`

## Workflow

1. Convert research into significant design decisions.
2. Define behavior-based step list (not code tasks). First name the client/stakeholder; write each behavior in their language and value; reject implementation mechanics (schemas, fields, error codes, function/method/class names, the linter, CI, HTTP status). Litmus test: would the stakeholder recognize this as something they asked for and care about? If it mentions code/internals, it FAILS — rewrite. (Escape hatch: only when the user explicitly states the client is a developer or internal/consuming system may you use developer terms.)
3. Include dependencies and likely touched files per step.
4. Add quality checkpoint markers every 2-3 steps.
5. Present for user approval before implementation. Run the review via @create-implementation-plan on `implementation-plan.md` (the rich plan with Technical Design + Behaviors) — this document, NOT `PLAN_STEPS.md`, is what the user reviews.

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

- `tmp/orchestrated-feature-dev/implementation-plan.md` (the review artifact)
- `tmp/orchestrated-feature-dev/PLAN_STEPS.md` — internal loop state derived from the approved plan; write it ONLY AFTER the plan is approved and never present it to the user for review

`PLAN_STEPS.md` format:

```markdown
## Step 1: <observable behavior>
- Status: pending
- Depends on: none
- Likely files: ...
```
