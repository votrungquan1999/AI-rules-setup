# Node: BDD Scenario Step

Execute one BDD scenario (test-first) for a single observable behavior.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

> **You run inside a batch subagent.** Your prompt assigns a batch of related steps; do them one at a time (this node = one step). You cannot talk to the user — so wherever this node says "escalate," it means **BUBBLE UP**: stop, write your progress, and return control to the orchestrator with the gate details. The orchestrator escalates to the user and re-spawns you to resume. Never guess past a gate.

## Input

- `<ws>/PLAN_STEPS.md`
- `<ws>/IMPLEMENTATION_PROGRESS.md`
- `<ws>/INVESTIGATION_STEP_<N>.md` for current step

## Workflow

1. Select first `pending` step.
2. Write exactly one behavior test.
3. Scaffold the structure the test touches (register the route, add the field, empty handler returning a default) — no behavior logic. If the minimal scaffolding already IS the implementation (no meaningful red possible), write just enough code to pass first and expect green from the first run; record it as such.
4. **Meaningful-test gate.** Confirm a meaningful test (valid + sensitive assertion, reachable fixtures/environment) can actually be written and set up. This differs from "no meaningful red" (a real test exists, just passes immediately). If NO meaningful test is possible (non-deterministic output, unmockable external system, no harness), do NOT write a hollow test or silently skip — **BUBBLE UP**: stop, write progress, return control with the behavior, what you tried, and exactly what blocks a meaningful assertion or setup. The orchestrator offers the user skip / defer / make-testable and re-spawns you with the decision. On skip: implement the behavior (step 6) and record `test skipped (no meaningful test possible — user approved: reason)`. On make-testable: return to step 2.
5. Run test before writing behavior logic. A structural failure (404, missing field, import error) is NOT a valid red — fix the scaffolding and run again.
6. If failing on the behavior assertion, implement minimal code to pass.
7. Re-run test and related nearby tests.
8. **Review the full diff of this behavior** — every file you touched, not just the last edit. Every hunk is intentional and belongs to this step (drop debug leftovers, stray formatting, edits to files this behavior should not own — under `per-behavior` they would land in the wrong commit; the `Files changed` list you record must match the diff, the commit step stages from it). Comments are concise and skimmable: one line, one idea, WHY not WHAT — delete any that restate the code. A top-of-file/function block that narrates the steps below it is **broken up and distributed** — move each piece next to the line it describes, leave at most a one-line intro. No ticket IDs in code. Re-run the scoped test if anything changed.
9. **Never mutate the implementation to check a test is sensitive.** Judge sensitivity by reading the assertion: would it still pass if the behavior were wrong? Injecting a real defect is Phase 5c's job — budgeted, alone, via a restoring harness. Mutating here with `Edit` (or `cp` + edit) has left mutants in the tree and corrupted later steps.
10. Mark step status and progress updates.
11. **Commit the behavior — only under `per-behavior`.** Read `<ws>/COMMIT_PLAN.md`; if `Strategy: defer`, run no git commands at all. Otherwise commit this behavior now per `nodes/commit-protocol.md`: capture `Base:` if you are the run's first behavior commit, stage **explicit paths only** (never `git add -A`, `-a`, or `.`), one commit whose subject names the behavior, then record the row as `committed`. Commit **per behavior, not per batch** — each behavior in your batch gets its own commit as it goes green.

**Other bubble-up triggers (same protocol):** 2+ defensible implementation behaviors for the step, or an unexpected failure you cannot resolve with minimum code. Stop, write progress, return control — the orchestrator escalates and re-spawns you with the decision.

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

If this step involved a choice between 2+ viable implementation approaches — including an approved test-skip at the meaningful-test gate (skip vs defer vs make-testable) — append an entry to `<ws>/DECISIONS.md` (create if absent): option chosen, alternative(s), one-line why (note "user chose" when escalated). The summary phase reports these.
