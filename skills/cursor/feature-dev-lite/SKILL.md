---
name: feature-dev-lite
description: Single-session feature delivery — context gathering, plan-first development, test-first implementation, and quality gates. Use for small-to-medium features or multi-file tasks you're building solo in one pass.
---

# Feature Dev Lite

Build features incrementally with explicit planning and verification.

## When to Use

- User asks to implement a non-trivial feature.
- Work spans multiple files or systems.
- Requirements or tradeoffs need validation.

## Core Principles

1. Context first.
2. Plan by behavior before implementation — technical steps live inside the behavior they serve.
3. Test behavior, not internals.
4. Test the real flow, not mocks — integration level by default.
5. Every test must be able to fail — if the asserted value is already fixed by the test's own mock setup, it proves nothing; don't write it.
6. Ship one behavior at a time, each proven before the next is built on it.

## Workflow

### Phase 0: Establish the Task Workspace

**Before writing any notes, plan, or progress file:**

- If a caller gave you a working directory (e.g. the orchestrator passes `<ws>` = `./tmp/<identifier>/`), use it.
- Otherwise, ask the user for a **task identifier** — a ticket id (e.g. `JIRA-123`) or any short label; if they have none, derive a short kebab-case slug and **confirm it**. Then `<ws>` = `./tmp/<identifier>/` (create it).

`<ws>` is that working directory. Write the plan and progress file (e.g. `<ws>/IMPLEMENTATION_PROGRESS.md`) under it so multiple tasks run in parallel without colliding. **Before creating `<ws>` or writing, check whether it already holds artifacts from unrelated work — if so, STOP and ask the user how to proceed; never overwrite another task's artifacts.**

### Phase 1: Context and Clarification

1. Read relevant code paths and existing patterns.
2. **Survey the project's test patterns** — the test command, test dirs/naming, harness and setup files (vitest/jest config, `conftest.py`, playwright, testcontainers, supertest, a test DB), fixtures/factories/state reset, and **one existing integration test read end to end** as the file to mirror. Commit to a verdict: the harness + its command + the example file, or `none found`. A pile of mock-heavy unit tests is not an integration harness.
3. Clarify ambiguous requirements before coding.
4. Confirm scope and acceptance criteria.

### Phase 2: Plan

1. Create a short implementation plan: ordered observable behaviors, each with a clear acceptance check, plus dependencies between behaviors.
2. Include risk notes and test strategy per behavior.
3. Before presenting, re-read every heading against the behavior check below and fix any that fail; present the plan as behaviors with their steps nested under them.
4. Get user confirmation when plan materially changes behavior.

**A behavior is the unit of planning, acceptance and commit:** one heading in the client's language, with its own acceptance check. **Steps** are the ordered technical work inside one behavior, numbered under it (`Step 2.1`, `Step 2.2`), with a test run wherever it gates the next step. Most behaviors need no steps beyond the default test-first cycle — add steps only when one needs several changes (a query rewrite plus an index, a migration plus a backfill).

**Behavior check — run it on every heading before the plan is presented.** A heading that fails is a step, or belongs elsewhere:
- **No acceptance check of its own, or only makes sense after the heading before it** → a step inside the behavior it serves.
- **Setup or groundwork** (a test harness, config or flag removal, a migration, a refactor that only enables new work) → steps of the first behavior that needs it; cleanup goes in the behavior that makes the old code dead.
- **"Still works as before" inside a feature** → not a behavior; name the existing suites that pin it in the step that risks it, and add a pin test only where nothing covers the path.
- **Comes from the code, not the request** → a note in the behavior that covers it, or a question for the user.
- **Two outcomes the client would check separately** → split them. **One outcome split across headings by technical step** → merge them.
- **Only verifies other behaviors** (an end-to-end run, a speed check across several) → `### Final check`: checks only, never code changes.

**Acceptance — exactly one mode per behavior:**
1. **New behavior** (default) — a new test runs red, then green after the implementation.
2. **Trivial** — green from the first run; no meaningful red is possible.
3. **Unchanged outcome under a risky change** (refactor, performance, migration, upgrade) — only when the request changes *how* something works, not *what* the client sees. Pin today's behavior with a test green before the change and after; when existing suites already pin it, name them and write no new test. Measure a non-functional goal (speed, memory) before and after, inside the behavior.

Only mode 3 gets an `**Acceptance:**` line in the plan.

Plan shape:

```markdown
## Behaviors to Implement

### Behavior 1: [Observable behavior]
- [ ] Write test
- [ ] Run test
- [ ] Implement (if needed)
- [ ] Run test (if implemented)

### Behavior 2: [Observable behavior that needs several changes]
- [ ] Write test
- [ ] Run test
- [ ] Step 2.1: [first technical change]
- [ ] Step 2.2: [next technical change]
- [ ] Run test

### Behavior 3: [Outcome that must not change, plus the goal — e.g. "… the same results, faster"]
**Acceptance:** unchanged outcome — pinned by [named suites | a new pin test]; [metric] before → after
- [ ] Pin: run it green on today's code; measure [metric]
- [ ] Step 3.1: [technical change] — run the pin, still green
- [ ] Measure [metric] again

### Quality Checkpoint (after every 2-3 behaviors)
- [ ] Review test quality
- [ ] Review code for refactoring

### Final check
- [ ] [A check that spans several behaviors — an end-to-end run, a speed check]
```

Behaviors 2-3 show the other shapes — use them only when needed; a plain feature uses the first shape throughout. Omit `### Final check` when no check spans several behaviors.

### Phase 2b: Decide How to Commit

Ask the user **before writing any code** — the plan is approved and the behavior list is final, so this is the last stable moment. Two options:

- **One commit per behavior** — commit each behavior as soon as it goes green, and fold every later fix (quality gate, review) back into the commit owning that behavior, so you end with exactly one commit per behavior. Say plainly that folding **rewrites history**, so it is only free while the branch is unpushed.
- **Defer all commits** — never touch git; changes accumulate in the working tree and the user commits at the end.

Record the answer (and the base SHA from `git rev-parse HEAD` if per-behavior) at the top of `<ws>/IMPLEMENTATION_PROGRESS.md`. Don't start Phase 3 until the user has chosen.

**In the same message, if the Phase 1 survey found no integration harness, ask how to test.** Skip this when a harness exists — just record `Test level: integration via <harness>`. Otherwise offer: **stand one up** (name the concrete setup and its cost — it becomes the first steps of the first behavior that needs it, never a heading of its own), **point you at one you missed**, or **accept unit-level for this feature** (wiring goes unverified). Never fall back to mocked unit tests unasked, and never invent containers or a browser runner without that answer. Retrofitting a harness after ten mocked tests means rewriting them, which is why the question lands here.

**Under one-commit-per-behavior:**

- Commit when a behavior is green and its tests, lint, and diff review (Phase 3 step 7) pass — after its last step, never once per step. Stage **explicit paths only** — never `git add -A`, `-a`, or `.`. One behavior, one commit, subject naming the behavior in the repo's convention.
- Fold a later fix into its owning commit: `git commit --fixup <sha>` then `GIT_SEQUENCE_EDITOR=true git rebase --autosquash <base>` (that env var is what keeps the rebase non-interactive). Re-run affected tests after.
- Resolve the owning commit **by subject**, not a remembered SHA (`git log --format='%H %s' <base>..HEAD`) — every autosquash rewrites the SHAs after it.
- A fix that adds genuinely new behavior is a **new plan behavior** with its own commit, not a fold.
- **Stop and ask** if the owning commit is already pushed (fold + `--force-with-lease`, or a follow-up commit that breaks the count) or if a rebase conflicts. Never force-push unprompted; never resolve a conflict with `-X ours` / `-X theirs`.

### Phase 3: Implement Incrementally

For each behavior:

1. Define behavior scenario(s) — default to **one flow-level test** per behavior, mirroring the example file from the survey.
2. Write ONE test at a time, at the **integration level**: drive the real flow through the entry point a client uses (HTTP route, CLI command, exported service function, rendered component) with real collaborators, and assert what the client observes. Mock only what you cannot run (third-party calls, payments, email/SMS, clocks, randomness) — never the code's own neighbours. A mocked test verifies the mock and stays green while the route is unregistered, the transaction never commits, or the serializer drops a field. Unit tests supplement it for interior cases the flow cannot reach; they never replace it. **Never assert a value your own mock setup already fixed** (stub returns `X` → assert `X`) — the implementation sits outside the causal path, so it passes against a pass-through.
3. Scaffold the structure the test touches (route, field, empty handler returning a default) — no behavior logic.
4. Run the test before writing behavior logic — expect a failure on the behavior assertion. A structural error (404, missing field, import error) is NOT a valid red; fix the scaffolding and re-run. If no meaningful red is possible (the scaffolding IS the implementation), write just enough code to pass first and expect green from the first run — note this explicitly.
5. Implement minimal code to satisfy behavior. If the behavior has steps, do them in order — they are this implementation — and run the test after any step the next one depends on; mark each step done in the progress file as it lands.
6. Re-run tests and quick lint/type checks.
7. **Review the full diff of this behavior** — every file you touched, not just the last edit. Every hunk is intentional and owned by this behavior (drop debug leftovers, stray formatting, edits to files another behavior owns — under one-commit-per-behavior they land in the wrong commit); comments are concise and skimmable (one line, one idea, WHY not WHAT — delete any that restate the code); a top-of-file/function block that narrates the steps below it is **broken up and distributed** next to the line each piece describes, at most a one-line intro left; no ticket IDs in code. Re-run the scoped test if anything changed.
8. Move to the next behavior only when the current one meets its acceptance check. A behavior with several steps is still one commit, made after its last step.

**Unchanged-outcome behaviors** (refactor, performance, migration, upgrade) expect no red — don't manufacture one. Run the pin (the named suites, or a new pin test) **green on today's code before any change** and take the before measurement if the plan names one; a red pin means the pin is wrong, so stop and ask. Then do the steps in order, re-running the pin after each step that could break it, and take the after measurement at the end.

### Phase 4: Quality Gate

After every 2-3 behaviors:

- Review test quality and coverage gaps. Run the necessity gate first: a test that cannot fail is **deleted**, not improved.
- Refactor only where it improves clarity/safety.
- Re-verify before continuing.
- Under one-commit-per-behavior, **fold each fix into the commit owning that behavior** (Phase 2b) rather than adding a new commit.

### Phase 5: Wrap Up

- **Run the Final check** if the plan has one — the checks that span several behaviors. Record the result in the progress file; it changes no code.
- **Check the commit invariant.** Under one-commit-per-behavior, `git rev-list --count <base>..HEAD` must equal the number of completed behaviors. Report the count either way; if they differ, say so plainly and name the likely cause (a fix committed separately instead of folded, or a behavior never committed). Under defer, note the changes are uncommitted by design.

## Suggested Progress Format

Write progress to `<ws>/IMPLEMENTATION_PROGRESS.md`:

```markdown
### Behavior N: <behavior>
- Status: In progress | Done
- Acceptance: new behavior: red → green | trivial: green from start | unchanged outcome: pinned green before and after by <test or suites>[; metric before → after]
- Steps: (only when the behavior has several) ✅ Step 2.1: <change> — test run green; ⏳ Step 2.2: <change>
- Tests: <new/updated tests>
- Notes: <important choices or risks>
```

## Guardrails

- No large speculative refactors mid-feature.
- No skipping tests for behavior-changing code.
- No mocking the code's own collaborators to dodge the real flow.
- No asserting a value your own mock setup already fixed, and no asserting a collaborator *was called* in place of the outcome the client observes.
- No adding a test to lift a coverage number rather than to pin a behavior.
- No silent fallback to unit tests when no harness exists — ask (Phase 2b).
- Keep scope aligned with user-approved plan.
