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
3. Scaffold the structure the test touches (register the route, add the field, empty handler returning a default) — no behavior logic. If the minimal scaffolding already IS the implementation (no meaningful red possible), write just enough code to pass first and expect green from the first run; record it as such.
4. **Meaningful-test gate.** Confirm a meaningful test (valid + sensitive assertion, reachable fixtures/environment) can actually be written and set up. This differs from "no meaningful red" (a real test exists, just passes immediately). If NO meaningful test is possible (non-deterministic output, unmockable external system, no harness), do NOT write a hollow test or silently skip — STOP and ask the user to skip the test for this behavior, defer it, or make it testable. Skip ONLY on explicit approval; if skipped, still implement the behavior and record the reason. If made testable, return to step 2.
5. Run test before writing behavior logic. A structural failure (404, missing field, import error) is NOT a valid red — fix the scaffolding and run again.
6. If failing on the behavior assertion, implement minimal code to pass.
7. Re-run test and related nearby tests.
8. Mark step status and progress updates.

## Output

Update:

- `<ws>/PLAN_STEPS.md`
- `<ws>/IMPLEMENTATION_PROGRESS.md`

Progress entry format:

```markdown
## Step <N>
- Behavior:
- Test result: red->green | green from start (no meaningful red possible) | test skipped (no meaningful test possible — user approved: reason) | already covered
- Files changed:
- Regressions: none | ...
```
