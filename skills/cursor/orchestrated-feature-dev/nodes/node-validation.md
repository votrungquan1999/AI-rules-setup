# Node: Validation

Validate a batch of related completed behaviors (grouped by shared files) after implementation. Process assigned behaviors ONE AT A TIME.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

> **Report only — never touch git.** Several instances of you run in parallel, so staging, committing, or rebasing here would race the others and corrupt the branch. Record what needs fixing in your verdict; the single fix subagent that follows applies it and folds it into the owning commit.

## Input

- `<ws>/implementation-plan.md` and `<ws>/PLAN_STEPS.md` — read only the sections relevant to your assigned behaviors, ONCE
- `<ws>/IMPLEMENTATION_PROGRESS.md` — read your assigned behaviors' entries plus the entries of behaviors sharing the same files (for cross-behavior checks), not the whole file
- Assigned behavior numbers (your batch)

## Workflow

For EACH assigned behavior, one at a time (files shared between assigned behaviors need reading only once):

1. Confirm implementation matches planned behavior, every planned step included.
2. Verify each test EARNS ITS PLACE, then its coverage and meaningfulness. Necessity first: what defect would this test catch that no other catches? "None" means **delete it**, not improve it — and reject entailed assertions outright (stub returns `X` → assert `X` leaves the implementation outside the causal path; it passes against a pass-through). Then coverage is good (happy path + relevant edge/error cases tested, note anything untested), and each test is meaningful (4 Pillars — asserts the observable outcome, not a collaborator's call log, and fails if behavior is wrong; reject hollow/tautological/over-mocked tests — decide by reading, **never mutate the source to find out**: you run in parallel with other validators and a mutated file breaks their test runs; Phase 5c proves it empirically). If the behavior is marked `test skipped (no meaningful test possible — user approved)`, confirm it was approved and record the behavior as untested rather than flagging a gap to fix.
3. **No new test is valid only for an unchanged-outcome behavior.** Confirm the progress trail shows the pin green before the first change and after the last, that the named suites really exercise the outcome, and that any planned measurement has both numbers. A "no new test" behavior outside this mode is a finding.
4. Check cross-behavior consistency for shared files.
5. Run the behavior's tests (or its pin) and related tests.
6. Classify result.

## Output

For EACH assigned behavior `N`, write `<ws>/VALIDATION_STEP_<N>.md` (one file per behavior):

```markdown
## Behavior
## Plan Match: yes | partial | no
## Test Quality and Coverage: every test earns its place (yes | no — which to delete); coverage adequate (yes | partial — what's untested); tests meaningful (yes | no — asserts an outcome, not an entailed value or a call log); or "pinned by existing suites: names"; or "test skipped (user approved): reason"
## Cross-Behavior Conflicts
## Issues Found
## Verdict: valid | valid-with-caveats | invalid
```
