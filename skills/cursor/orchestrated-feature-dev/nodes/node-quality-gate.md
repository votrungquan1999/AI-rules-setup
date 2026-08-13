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
5. **Fold each fix into the behavior that owns it.** Read `<ws>/COMMIT_PLAN.md`; if `Strategy: defer`, run no git commands. Under `per-behavior`, a refactor or test fix touching already-committed behavior code belongs in that behavior's commit, not a new one — follow the fold procedure in `nodes/commit-protocol.md`. A fix spanning several behaviors folds into each owning commit separately. If the owning commit is already pushed, or a rebase conflicts, **stop and hand it back to the orchestrator** rather than forcing it.

## Output

Write `<ws>/QUALITY_RESULT.md`:

```markdown
## Checkpoint
## Test Quality: pass | issues
## Code Quality: pass | issues
## Fixes Applied
## Verdict: pass | needs-fixes
```
