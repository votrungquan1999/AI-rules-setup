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
2. Plan before implementation.
3. Test behavior, not internals.
4. Ship in small, verifiable steps.

## Workflow

### Phase 0: Establish the Task Workspace

**Before writing any notes, plan, or progress file:**

- If a caller gave you a working directory (e.g. the orchestrator passes `<ws>` = `./tmp/<identifier>/`), use it.
- Otherwise, ask the user for a **task identifier** — a ticket id (e.g. `JIRA-123`) or any short label; if they have none, derive a short kebab-case slug and **confirm it**. Then `<ws>` = `./tmp/<identifier>/` (create it).

`<ws>` is that working directory. Write the plan and progress file (e.g. `<ws>/IMPLEMENTATION_PROGRESS.md`) under it so multiple tasks run in parallel without colliding. **Before creating `<ws>` or writing, check whether it already holds artifacts from unrelated work — if so, STOP and ask the user how to proceed; never overwrite another task's artifacts.**

### Phase 1: Context and Clarification

1. Read relevant code paths and existing patterns.
2. Clarify ambiguous requirements before coding.
3. Confirm scope and acceptance criteria.

### Phase 2: Plan

1. Create a short implementation plan with ordered steps.
2. Include risk notes and test strategy per step.
3. Get user confirmation when plan materially changes behavior.

### Phase 2b: Decide How to Commit

Ask the user **before writing any code** — the plan is approved and the behavior list is final, so this is the last stable moment. Two options:

- **One commit per behavior** — commit each behavior as soon as it goes green, and fold every later fix (quality gate, review) back into the commit owning that behavior, so you end with exactly one commit per behavior. Say plainly that folding **rewrites history**, so it is only free while the branch is unpushed.
- **Defer all commits** — never touch git; changes accumulate in the working tree and the user commits at the end.

Record the answer (and the base SHA from `git rev-parse HEAD` if per-behavior) at the top of `<ws>/IMPLEMENTATION_PROGRESS.md`. Don't start Phase 3 until the user has chosen.

**Under one-commit-per-behavior:**

- Commit when a behavior is green and its tests, lint, and diff review (Phase 3 step 7) pass. Stage **explicit paths only** — never `git add -A`, `-a`, or `.`. One behavior, one commit, subject naming the behavior in the repo's convention.
- Fold a later fix into its owning commit: `git commit --fixup <sha>` then `GIT_SEQUENCE_EDITOR=true git rebase --autosquash <base>` (that env var is what keeps the rebase non-interactive). Re-run affected tests after.
- Resolve the owning commit **by subject**, not a remembered SHA (`git log --format='%H %s' <base>..HEAD`) — every autosquash rewrites the SHAs after it.
- A fix that adds genuinely new behavior is a **new step** with its own commit, not a fold.
- **Stop and ask** if the owning commit is already pushed (fold + `--force-with-lease`, or a follow-up commit that breaks the count) or if a rebase conflicts. Never force-push unprompted; never resolve a conflict with `-X ours` / `-X theirs`.

### Phase 3: Implement Incrementally

For each step:

1. Define behavior scenario(s).
2. Write ONE test at a time.
3. Scaffold the structure the test touches (route, field, empty handler returning a default) — no behavior logic.
4. Run the test before writing behavior logic — expect a failure on the behavior assertion. A structural error (404, missing field, import error) is NOT a valid red; fix the scaffolding and re-run. If no meaningful red is possible (the scaffolding IS the implementation), write just enough code to pass first and expect green from the first run — note this explicitly.
5. Implement minimal code to satisfy behavior.
6. Re-run tests and quick lint/type checks.
7. **Review the full diff of this behavior** — every file you touched, not just the last edit. Every hunk is intentional and owned by this step (drop debug leftovers, stray formatting, edits to files another step owns — under one-commit-per-behavior they land in the wrong commit); comments are concise and skimmable (one line, one idea, WHY not WHAT — delete any that restate the code); a top-of-file/function block that narrates the steps below it is **broken up and distributed** next to the line each piece describes, at most a one-line intro left; no ticket IDs in code. Re-run the scoped test if anything changed.
8. Move to next step only when current step is stable.

### Phase 4: Quality Gate

After every 2-3 steps:

- Review test quality and coverage gaps.
- Refactor only where it improves clarity/safety.
- Re-verify before continuing.
- Under one-commit-per-behavior, **fold each fix into the commit owning that behavior** (Phase 2b) rather than adding a new commit.

### Phase 5: Wrap Up

- **Check the commit invariant.** Under one-commit-per-behavior, `git rev-list --count <base>..HEAD` must equal the number of completed behaviors. Report the count either way; if they differ, say so plainly and name the likely cause (a fix committed separately instead of folded, or a behavior never committed). Under defer, note the changes are uncommitted by design.

## Suggested Progress Format

Write progress to `<ws>/IMPLEMENTATION_PROGRESS.md`:

```markdown
## Step N: <behavior>
- Status: In progress | Done
- Tests: <new/updated tests>
- Notes: <important choices or risks>
```

## Guardrails

- No large speculative refactors mid-feature.
- No skipping tests for behavior-changing code.
- Keep scope aligned with user-approved plan.
