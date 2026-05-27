# Node: Summary

Produce final delivery summary after validation.

## Input

- `tmp/orchestrated-feature-dev/RESEARCH_OUTPUT.md`
- `tmp/orchestrated-feature-dev/implementation-plan.md`
- `tmp/orchestrated-feature-dev/PLAN_STEPS.md`
- `tmp/orchestrated-feature-dev/IMPLEMENTATION_PROGRESS.md`
- `tmp/orchestrated-feature-dev/QUALITY_RESULT.md` (if present)
- `tmp/orchestrated-feature-dev/VALIDATION_STEP_<N>.md` files

## Workflow

1. Count completed versus planned steps.
2. Summarize quality gate and validation outcomes.
3. Aggregate changed files and test outcomes.
4. Note residual risks and follow-up actions.

## Output

Create `tmp/orchestrated-feature-dev/FINAL_SUMMARY.md`:

```markdown
## Feature Outcome
## Steps Completed
## Quality and Validation Results
## Files Changed
## Test/Lint Status
## Risks / Follow-ups
```
