# Node: Investigation

Investigate a batch of related planned steps (grouped by shared files/module) in depth before implementation. Process assigned steps ONE AT A TIME.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## Input

- `<ws>/implementation-plan.md` — read ONCE, reuse for all assigned steps
- `<ws>/PLAN_STEPS.md`
- Assigned step numbers (your batch)

## Workflow

For EACH assigned step, one at a time (files shared between assigned steps need reading only once):

1. Validate affected files and symbols exist as expected.
2. Check whether behavior is already implemented fully/partially.
3. Identify plan mismatches, dependency issues, and ordering conflicts.
4. Capture edge cases and integration risks.
5. Recommend precise plan fixes if needed.

## Output

For EACH assigned step `N`, write `<ws>/INVESTIGATION_STEP_<N>.md` (one file per step — downstream phases consume them per step):

```markdown
## Step
## Affected Files
## Already Implemented
## Plan Mismatches
## Risks
## Recommended Fixes
## Verdict: proceed | proceed-with-fixes | rework
```
