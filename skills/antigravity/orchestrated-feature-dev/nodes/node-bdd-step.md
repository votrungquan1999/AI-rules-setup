# Node: BDD Behavior

Deliver one observable behavior test-first: all of its steps, under the acceptance mode the plan names.

> **You run as a batch execution.** Your assignment is a batch of related behaviors (as many as possible, capped at 4). Work them one at a time — this node describes one behavior, with all its steps. You **cannot talk to the user**: wherever this node says "escalate," it means **BUBBLE UP** — stop, write your progress to `step-result.md` + `plan-steps.md`, and return control to the orchestrator with the gate details. The orchestrator escalates to the user and re-dispatches you to resume. Never guess past a gate.

## Input

Work through the behaviors assigned in your batch, one at a time, in `plan-steps.md` order. For each, treat the first `pending` assigned behavior as your current target.
Read the `loop-state.json` artifact for the current behavior counter.

## Execution

### 1. Identify the Behavior

Find the first behavior with `Status: pending` in `plan-steps.md`. This is your target. Its `Acceptance` line names the mode, and its `### Step N.M` entries (if any) are the ordered technical work you will do in step 4, each with its own files and notes. Skip any step already `done` — you are resuming after a bubble-up.

**Unchanged outcome** (refactor, performance, migration, upgrade) runs differently — no red is expected, so do not manufacture one:
- **Pin first.** Run the pin — the named suites, or a new pin test written as in sections 2-2b below — **green on today's code, before any change**. A red pin means the pin is wrong or today's behavior is not what the plan assumes: bubble up.
- **Measure before.** If the entry names a metric, take the before number now.
- Then do the steps in order (step 4), re-running the pin after each step that could break it.

### 2. Write the Test

Use BDD-style Given/When/Then structure:

```typescript
describe('[Feature/Scenario name]', () => {
  it('should [expected outcome]', async () => {
    // Given
    // When
    // Then
  })

  // Use nested describe only to group multiple related tests:
  // describe("when [specific condition]", () => {
  //   it("should [outcome A]", ...);
  //   it("should [outcome B]", ...);
  // });
})
```

### 2b. Test Level: Integration First

**Write the test at the integration level: drive the real flow through the entry point a client actually uses** — the HTTP route, the CLI command, the exported service function, the rendered component — **with its real collaborators** (real router, real serialization, real DB against the project's test database). Assert what the client observes. Your instructions name the harness, its command, and an example file from research: **mirror that example** rather than inventing a shape.

A unit test that mocks its collaborators verifies the mock. It stays green while the route is unregistered, the transaction never commits, the serializer drops a field, or two modules disagree about a shape — exactly the defects that reach production, and exactly what a behavior-level red is supposed to catch.

- **Mock only what you cannot run**: third-party network calls, payment providers, email/SMS, clocks, randomness. Never mock the module's own neighbours just to isolate it.
- **A unit test is a supplement, never the substitute.** When an interior case is unreachable from the flow (a pure-function branch, a parsing edge, date arithmetic), the behavior still gets its flow-level test and the unit test covers the interior.
- **Never assert a value your own mock setup already fixed.** Stub returns `X` → assert the result is `X` puts the implementation outside the causal path: the test passes if you replace the code under test with a pass-through, so it can never go red for a real defect. Assert the observable outcome instead; asserting a collaborator *was called* is wiring, not behavior.
- **The level is already settled** — the orchestrator resolved it at the research gate. If you were given `unit-level (user accepted)`, write unit tests and say so. If the named harness turns out not to work, that is a **bubble-up** (2e), not a licence to fall back to mocks.

### 2c. One Test at a Time

**IMPORTANT:** Write exactly **one test** (one `it()` block) at a time, and run it before writing more. A behavior gets one flow-level test by default; add another only for a case the first cannot reach. Do NOT batch multiple behaviors into one entry. The behavior is the unit of acceptance and commit — its steps are the implementation work under that test, not tests of their own.

### 2d. Scaffold Structure

Put in place whatever structure the test touches — register the route, add the field, create the empty handler returning a default — so the test run can only fail on the behavior assertion. Scaffolding contains **no behavior logic**.

**If no meaningful red is possible** (the minimal scaffolding to avoid a structural failure already IS the implementation — e.g., a trivial pass-through or a field that just renders), write just enough code to pass first and expect **green from the first run**. Record `green from start (no meaningful red possible)` in the Output.

### 2e. 🚫 GATE: Meaningful Test Possible? (escalate if not)

Before running, confirm a **meaningful** test can actually be written AND set up for this behavior. A meaningful test (per the 4 Pillars) has a **valid, sensitive assertion** — it would fail if the behavior were wrong — and its preconditions/fixtures/environment can be set up reliably.

This is NOT the same as "no meaningful red" (2d): there, a real, asserting test exists and simply passes from the first run. Here, you **cannot construct a meaningful test at all** — e.g., no way to assert the real outcome, output is non-deterministic and can't be made stable, or the behavior depends on an external system/environment you can't mock, seed, or stand up.

When you hit this, do NOT write a hollow test (one that asserts nothing real or passes regardless) just to satisfy the ritual, and do NOT silently skip it. Instead **BUBBLE UP** (stop and return control to the orchestrator, which escalates to the user):

- Report the behavior, what you tried, and exactly what blocks a meaningful assertion or test setup.
- The options the orchestrator will offer the user: **skip the test** for this behavior (still implement it), **defer** the behavior, or **provide a way to make it testable** (a fixture, seam, or mock).
- Do not proceed on this behavior until the orchestrator re-dispatches you with the decision.

When re-dispatched: if the decision is skip, implement the behavior (step 4) then record it as `test skipped (no meaningful test possible — user approved: [reason])` in the Output; if it was made testable, return to step 2 and write the test.

**Other bubble-up triggers (same protocol):** 2+ defensible implementation behaviors while building it, or an unexpected failure you cannot resolve with minimum code. Stop, write progress, return control.

### 3. 🚫 GATE: Run the Test

**Before running**, check `package.json` for the project's existing test command (e.g., `npm test`, `npm run test:unit`). Use that command instead of hardcoding `npx vitest run`. Pass the specific test file path to scope the run.

Run the test. You **MUST** see the result before writing ANY behavior logic.

- **If it fails on the behavior assertion** → real red, proceed to step 4
- **If it fails structurally** (404 route not registered, missing field, import error) → that red validates nothing; fix the scaffolding (step 2d) and run again
- **If it passes** → either the behavior is already covered (nothing changed: update `plan-steps.md`, skip to Output), or this is the expected green-from-start case (the scaffolding IS the implementation — skip to step 6 so it still gets reviewed and committed), or it is the pin of an unchanged-outcome behavior (expected — proceed to step 4)

### 4. Implement

Write the **minimum code** to make the test pass. Nothing more. If the behavior has `### Step N.M` entries, do them in order — they are this implementation — run the test after any step the next one depends on, and set each step's `Status: done` in `plan-steps.md` as it lands.

### 5. Run the Test Again

Confirm it passes. Also run any related previous tests to check for regressions. For an unchanged-outcome behavior, the pin must still be green, and you take the after measurement now.

- **If all pass** → proceed to step 6
- **If regression** → fix the regression, run tests again

### 6. Review the Changes

Read the **full diff of this behavior** — every file you touched, not just the last edit (`git diff` on those paths; under `defer` the working tree is the diff). Check:

- **Every hunk is intentional and belongs to this behavior.** Drop debug leftovers, stray formatting churn, and edits to files this behavior should not own — under `per-behavior` they would land in the wrong commit. The `Files Changed` list in your Output must match this diff exactly; the commit step stages from it.
- **Comments follow the project's comment rules.** Read the comment rules in the project's rules (`.agents/rules/`) and check every comment you added or changed against each one; rewrite or delete any that break one. They apply on top of the defaults below and win where the two conflict.
- **Comments are concise and skimmable.** One line, one idea; say WHY, not WHAT. Delete any comment that restates the code or narrates an obvious step. Match the surrounding code's comment density.
- **No narrating block at the top.** A file- or function-level comment that walks through the steps of the code below it (`// 1. fetch… 2. validate… 3. save…`) gets **broken up and distributed**: move each piece next to the line or clause it describes, so a dev reads it in place. Leave at most a one-line intro at the top.
- **Ticket IDs stay out of the code** — they belong in the commit message.

If anything changed, re-run the scoped test before moving on.

**Do NOT mutate the implementation to check the test is sensitive.** Judge sensitivity by reading the assertion, against the observable outcome only — a collaborator's call log is wiring, not behavior. Would the assertion still pass if the behavior were wrong? Injecting a real defect is Phase 5c's job — budgeted, alone, via a restoring harness. Mutating here has left mutants in the tree and corrupted later steps.

### 7. Quick Refactor (Optional)

Only if there's an obvious improvement. Keep it small. Run tests again.

### 8. Commit the Behavior (only under the `per-behavior` strategy)

Read `commit-plan.md`. If `Strategy: defer`, **skip this step entirely — run no git commands at all.**

Under `Strategy: per-behavior`, this behavior is green, so commit it now per `nodes/commit-protocol.md`:
- Capture `Base:` first if you are the run's first behavior commit
- Stage **explicit paths only** — the files listed under "Files Changed" for this behavior in `step-result.md`; never `git add -A`, `-a`, or `.`
- One commit, subject naming the behavior in the repo's existing convention
- Record the row in `commit-plan.md` as `committed`

Commit **per behavior, not per batch and not per step** — your batch holds several behaviors and each gets its own commit as it goes green; a behavior with several steps is still one commit, made after its last step passes.

## Final Check Assignment

If your assignment is the `## Final check`, run what it lists after every behavior is done, record the results in `step-result.md` under `## Final check`, and set its status to `done` in `plan-steps.md`. It changes no code and makes no commit; a failure is a bubble-up.

## Output

Update the `plan-steps.md` artifact:

- Change the completed behavior's status to `done` (or `done (already covered)`, or `done (test skipped — no meaningful test possible, user approved)`)

Write to the `step-result.md` artifact:

```markdown
# Behavior Result

## Behavior [number]: [what was implemented]

## Acceptance: [new behavior: red → green | trivial: green from start (no meaningful red possible) | unchanged outcome: pinned green before and after by [test or suites][; metric before → after] | test skipped (no meaningful test possible — user approved: reason) | already covered]

## Steps: [only when the behavior has several — each `Step N.M` ✅, with the test run that gated it]

## Files Changed:

- [file1]: [what changed]
- [file2]: [what changed]

## Regressions: [none | list]

## Notes: [anything worth mentioning]
```

**Log any decision.** If this behavior involved a choice between **2+ viable implementation approaches** and you committed to one — including an approved test-skip at the meaningful-test gate (skip vs defer vs make-testable) — append an entry to the `decisions.md` artifact (create it if absent): option chosen, alternative(s), one-line why (note "user chose" when escalated). The summary phase reports these.

Update `loop-state.json` artifact: increment `current_behavior`.
