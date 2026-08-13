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
- `<ws>/DECISIONS.md` (if present — the decision log)
- `<ws>/COMMIT_PLAN.md` (the commit strategy and behavior→commit map)

## Workflow

1. Count completed versus planned steps.
2. Summarize quality gate and validation outcomes.
3. Aggregate changed files and test outcomes.
3b. **Check the commit invariant.** Under `Strategy: per-behavior`, `git rev-list --count <base>..HEAD` must equal the number of behaviors with status `done`. Report the count either way; if they differ, say so plainly and name the likely cause (a fix committed separately instead of folded, or a behavior never committed) rather than quietly reporting success. Under `Strategy: defer`, skip it and note the changes are uncommitted by design.
4. Summarize the decision log: each point where 2+ viable options existed and one was chosen.
5. Note residual risks and follow-up actions.

## Output

Create `<ws>/FINAL_SUMMARY.md`:

```markdown
## Feature Outcome
## Steps Completed
## Commits
[per-behavior: each commit subject against its behavior, and whether the counts match. defer: "no commits made — changes are in the working tree."]
## Quality and Validation Results
## Key Decisions
[each 2+-option choice and the picked option; omit only if the decision log is empty]
## Files Changed
## Test/Lint Status
## Risks / Follow-ups
```
