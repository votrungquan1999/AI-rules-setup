# Node: Validation

Validate one completed step after implementation.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## Input

- `<ws>/implementation-plan.md`
- `<ws>/PLAN_STEPS.md`
- `<ws>/IMPLEMENTATION_PROGRESS.md`
- Assigned step number `N`

## Workflow

1. Confirm implementation matches planned behavior.
2. Verify step-specific tests actually assert intended outcome.
3. Check cross-step consistency for shared files.
4. Run step-relevant tests.
5. Classify result.

## Output

Write `<ws>/VALIDATION_STEP_<N>.md`:

```markdown
## Step
## Plan Match: yes | partial | no
## Test Quality and Coverage
## Cross-Step Conflicts
## Issues Found
## Verdict: valid | valid-with-caveats | invalid
```
