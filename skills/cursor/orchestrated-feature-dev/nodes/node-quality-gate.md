# Node: Quality Gate

Run periodic quality checks across recent implementation steps.

> **Task workspace:** State files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt.

## Input

- `<ws>/PLAN_STEPS.md`
- `<ws>/IMPLEMENTATION_PROGRESS.md`

## Workflow

1. Review tests from recent 2-3 steps with `test-quality-reviewer`.
2. Review code quality/refactor opportunities with `code-refactoring`.
3. Apply fixes if issues are found.
4. Re-run related tests.

## Output

Write `<ws>/QUALITY_RESULT.md`:

```markdown
## Checkpoint
## Test Quality: pass | issues
## Code Quality: pass | issues
## Fixes Applied
## Verdict: pass | needs-fixes
```
