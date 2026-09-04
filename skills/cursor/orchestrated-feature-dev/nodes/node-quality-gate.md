# Node: Quality Gate

Run periodic quality checks across recent implementation steps.

> **Task workspace:** State files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt.

## Input

- `<ws>/PLAN_STEPS.md`
- `<ws>/IMPLEMENTATION_PROGRESS.md`

## Workflow

1. Review tests from recent 2-3 steps with `test-quality-reviewer`. Judge the Sensitivity pillar by **reading** the assertion. **No mutation testing in this gate** — do not edit source to see a test go red, and do not build a mutation harness. That pass runs once, in Phase 5c; doing it per gate re-mutates the same files 3-5 times a run, and one gate that did it spent 62 of its 68 minutes on 96 mutants. Suspect a hollow test? Report it and let 5c settle it.
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
