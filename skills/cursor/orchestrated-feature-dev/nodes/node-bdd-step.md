# Node: BDD Scenario Step

Execute one BDD scenario (test-first) for a single observable behavior.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## Input

- `<ws>/PLAN_STEPS.md`
- `<ws>/IMPLEMENTATION_PROGRESS.md`
- `<ws>/INVESTIGATION_STEP_<N>.md` for current step

## Workflow

1. Select first `pending` step.
2. Write exactly one behavior test.
3. Run test before implementation.
4. If failing, implement minimal code to pass.
5. Re-run test and related nearby tests.
6. Mark step status and progress updates.

## Output

Update:

- `<ws>/PLAN_STEPS.md`
- `<ws>/IMPLEMENTATION_PROGRESS.md`

Progress entry format:

```markdown
## Step <N>
- Behavior:
- Test result: red->green | already covered
- Files changed:
- Regressions: none | ...
```
