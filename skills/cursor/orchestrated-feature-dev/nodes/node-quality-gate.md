# Node: Quality Gate

Run periodic quality checks across recently implemented behaviors.

> **Task workspace:** State files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt.

## Input

- `<ws>/PLAN_STEPS.md`
- `<ws>/IMPLEMENTATION_PROGRESS.md`

## Workflow

1. Review tests from the recent 2-3 behaviors with `test-quality-reviewer`. Judge the Sensitivity pillar by **reading** the assertion. **No mutation testing in this gate** — do not edit source to see a test go red, and do not build a mutation harness. That pass runs once, in Phase 5c; doing it per gate re-mutates the same files 3-5 times a run, and one gate that did it spent 62 of its 68 minutes on 96 mutants. Suspect a hollow test? Report it and let 5c settle it.
2. Review code quality/refactor opportunities with `code-refactoring`.
3. **Review the comments** the recent behaviors added or changed, tests included. Read each touched file's diff with wide context (e.g. `-U20`); a pre-existing comment there is in scope only if the change made it wrong. Check each against the project's comment rules (`.cursor/rules/`) and the comment defaults in `nodes/node-bdd-step.md` step 8, and ask: **would a dev who never saw the old code, the diff, the plan or this session understand it?** For every comment that fails, write the fix — the replacement text, or "delete". When a reason is buried in history wording, restate it as a fact about the code as it is rather than dropping it.
4. Apply fixes if issues are found.
5. Re-run related tests.
6. **Fold each fix into the behavior that owns it.** Read `<ws>/COMMIT_PLAN.md`; if `Strategy: defer`, run no git commands. Under `per-behavior`, a refactor or test fix touching already-committed behavior code belongs in that behavior's commit, not a new one — follow the fold procedure in `nodes/commit-protocol.md`. A fix spanning several behaviors folds into each owning commit separately. If the owning commit is already pushed, or a rebase conflicts, **stop and hand it back to the orchestrator** rather than forcing it.

## Output

Write `<ws>/QUALITY_RESULT.md`:

```markdown
## Checkpoint
## Test Quality: pass | issues
## Code Quality: pass | issues
## Comments: pass | issues
## Fixes Applied
## Verdict: pass | needs-fixes
```
