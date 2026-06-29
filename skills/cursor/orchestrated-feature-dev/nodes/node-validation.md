# Node: Validation

Validate a batch of related completed steps (grouped by shared files) after implementation. Process assigned steps ONE AT A TIME.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## Input

- `<ws>/implementation-plan.md` and `<ws>/PLAN_STEPS.md` — read only the sections relevant to your assigned steps, ONCE
- `<ws>/IMPLEMENTATION_PROGRESS.md` — read your assigned steps' entries plus the entries of steps sharing the same files (for cross-step checks), not the whole file
- Assigned step numbers (your batch)

## Workflow

For EACH assigned step, one at a time (files shared between assigned steps need reading only once):

1. Confirm implementation matches planned behavior.
2. Verify test coverage AND meaningfulness: coverage is good (happy path + relevant edge/error cases tested, note anything untested), and each test is meaningful (4 Pillars — valid + sensitive assertion that fails if behavior is wrong; reject hollow/tautological/over-mocked tests). If the step is marked `test skipped (no meaningful test possible — user approved)`, confirm it was approved and record the behavior as untested rather than flagging a gap to fix.
3. Check cross-step consistency for shared files.
4. Run step-relevant tests.
5. Classify result.

## Output

For EACH assigned step `N`, write `<ws>/VALIDATION_STEP_<N>.md` (one file per step):

```markdown
## Step
## Plan Match: yes | partial | no
## Test Quality and Coverage: coverage adequate (yes | partial — what's untested); tests meaningful (yes | no — 4 Pillars); or "test skipped (user approved): reason"
## Cross-Step Conflicts
## Issues Found
## Verdict: valid | valid-with-caveats | invalid
```
