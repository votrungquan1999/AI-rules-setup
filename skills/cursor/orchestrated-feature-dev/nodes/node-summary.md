# Node: Summary

Produce final delivery summary after validation.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`. Remind the user the whole `<ws>` folder can be deleted once the feature is merged.

## Input

- `<ws>/RESEARCH_OUTPUT.md`
- `<ws>/implementation-plan.md`
- `<ws>/PLAN_STEPS.md`
- `<ws>/IMPLEMENTATION_PROGRESS.md`
- `<ws>/QUALITY_RESULT.md` (if present)
- `<ws>/VALIDATION_STEP_<N>.md` files

## Workflow

1. Count completed versus planned steps.
2. Summarize quality gate and validation outcomes.
3. Aggregate changed files and test outcomes.
4. Note residual risks and follow-up actions.

## Output

Create `<ws>/FINAL_SUMMARY.md`:

```markdown
## Feature Outcome
## Steps Completed
## Quality and Validation Results
## Files Changed
## Test/Lint Status
## Risks / Follow-ups
```
