# Node: Investigation

Investigate a batch of related planned behaviors (grouped by shared files/module) in depth before implementation. Process assigned behaviors ONE AT A TIME.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## Input

- `<ws>/implementation-plan.md` — read ONCE, reuse for all assigned behaviors
- `<ws>/PLAN_STEPS.md`
- Assigned behavior numbers (your batch)

## Workflow

For EACH assigned behavior and its steps, one at a time (files shared between assigned behaviors need reading only once):

1. Validate affected files and symbols exist as expected.
2. Check whether behavior is already implemented fully/partially.
3. Identify plan mismatches, dependency issues, and ordering conflicts between behaviors or between the steps inside one.
4. Capture edge cases and integration risks.
5. Recommend precise plan fixes if needed — a missing change is a new `Step N.M` inside this behavior, not a new heading.

## Output

For EACH assigned behavior `N`, write `<ws>/INVESTIGATION_STEP_<N>.md` (one file per behavior — the orchestrator folds each finding under its behavior or `Step N.M` in `PLAN_STEPS.md`, so tie every finding to the step it belongs to):

```markdown
## Behavior
## Affected Files (each tied to its Step N.M, or "—" for a behavior with no steps)
## Already Implemented
## Plan Mismatches
## Risks
## Recommended Fixes
## Verdict: proceed | proceed-with-fixes | rework
```
