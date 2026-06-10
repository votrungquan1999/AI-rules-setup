# Node: Investigation

Investigate one planned step in depth before implementation.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## Input

- `<ws>/implementation-plan.md`
- `<ws>/PLAN_STEPS.md`
- Assigned step number `N`

## Workflow

1. Validate affected files and symbols exist as expected.
2. Check whether behavior is already implemented fully/partially.
3. Identify plan mismatches, dependency issues, and ordering conflicts.
4. Capture edge cases and integration risks.
5. Recommend precise plan fixes if needed.

## Output

Write `<ws>/INVESTIGATION_STEP_<N>.md`:

```markdown
## Step
## Affected Files
## Already Implemented
## Plan Mismatches
## Risks
## Recommended Fixes
## Verdict: proceed | proceed-with-fixes | rework
```
