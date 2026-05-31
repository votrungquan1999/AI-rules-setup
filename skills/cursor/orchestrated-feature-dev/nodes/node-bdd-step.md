# Node: BDD Scenario Step

Execute one BDD scenario (test-first) for a single observable behavior.

## Input

- `tmp/orchestrated-feature-dev/PLAN_STEPS.md`
- `tmp/orchestrated-feature-dev/IMPLEMENTATION_PROGRESS.md`
- `tmp/orchestrated-feature-dev/INVESTIGATION_STEP_<N>.md` for current step

## Workflow

1. Select first `pending` step.
2. Write exactly one behavior test.
3. Run test before implementation.
4. If failing, implement minimal code to pass.
5. Re-run test and related nearby tests.
6. Mark step status and progress updates.

## Output

Update:

- `tmp/orchestrated-feature-dev/PLAN_STEPS.md`
- `tmp/orchestrated-feature-dev/IMPLEMENTATION_PROGRESS.md`

Progress entry format:

```markdown
## Step <N>
- Behavior:
- Test result: red->green | already covered
- Files changed:
- Regressions: none | ...
```
