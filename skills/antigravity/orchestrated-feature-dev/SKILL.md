---
name: orchestrated-feature-dev
description: N8N-style orchestrated feature development with specialized node skills, conditional routing, and quality gate loops. Covers research, planning, investigation, an implementation-blind behavior-risk catalog, batched BDD, and conformance + adversarial verification. Use when asked for "orchestrated development", "structured feature build", or "deep feature workflow". Not for quick edits — the gated pipeline is overkill there.
---

# Orchestrated Feature Development

An n8n-style workflow that orchestrates specialized node skills through a structured pipeline with conditional routing and reflection loops. The main session is the **orchestrator only** — it manages artifacts and routing, never performs research, implementation, or analysis itself.

## How This Works

This skill acts as an **orchestrator** — it sequences specialized node skills, passes data between them via artifact files, and makes routing decisions based on results. Each node reads from and writes to the Antigravity artifact directory (`<appDataDir>/brain/<conversation-id>/`).

Pipeline: research → plan → (investigation + behavior-risk catalog) → BDD batches ↔ quality gate → (conformance + adversarial verification) → summary.

## Orchestrator Rules

The main session MUST:
- **Only manage artifacts and routing** — never read code, analyze findings, or write implementation
- **Execute node instructions** for all research, planning, investigation, cataloguing, implementation, and verification work
- **Batch to the cap.** For the BDD phase (and the adversarial verification pass), a node execution takes **as many related behaviors as possible, capped at 4** (grouped by shared files/module) — one execution amortizes the shared-context read across its behaviors, but past ~4 the context congests and quality drops.
- **Read state artifacts** only to make routing decisions (pass/fail, next step, done/not done)
- **Present node outputs** to the user by reading and relaying their output artifacts. Nodes never talk to the user — they write artifacts and return control; the orchestrator owns every user-facing escalation.
- **Fix state artifacts** when investigation reveals plan issues (update `implementation-plan.md` first, then mirror into `plan-steps.md`)
- **The plan owns the behavior → step tree.** `plan-steps.md` mirrors `implementation-plan.md` title-for-title (`Behavior N`, `Step N.M`) and only adds build detail. Change a behavior or step in the plan first, then mirror it; after any edit to either artifact, list both artifacts' `Behavior N` / `Step N.M` titles and fix any mismatch before routing on — a silent mismatch builds something you never reviewed.
- **Freeze `behavior-risks.md`** once Phase 3b writes it — the adversarial pass checks the built code against it, so it must never be edited to match what was built.
- **Serialize git.** Under the `per-behavior` commit strategy, never dispatch BDD batches in parallel — concurrent executions committing to one branch corrupt each other's history, and batches are grouped by *shared files*, so one file's diff cannot be split across behaviors after the fact. Run batches one at a time. The Phase 5 verification passes stay parallel because they only report; the single fix pass does the git work.
- **Log decisions** — whenever any node, or the orchestrator itself (e.g. fixing the plan after investigation, or a routing choice), faces **2+ defensible options and commits to one** (including choices resolved by asking the user), append an entry to `decisions.md`: chosen option, alternative(s), one-line why. Skip forced moves where only one option was viable.

The main session MUST NOT:
- Read source code files directly (outside of node execution)
- Analyze or summarize research findings in its own words
- Write any implementation or test code (outside of node execution)
- Make judgment calls about code quality — delegate to nodes

## Artifact Convention

All workflow state files are created as Antigravity artifacts in the brain directory for the current conversation. Use `write_to_file` with `IsArtifact: true` to create/update these files. The artifact directory path is provided to you at the start of each conversation.

**Workflow artifacts:**

- `research-output.md` — Research findings
- `plan-steps.md` — Derived workflow state for the BDD loop: the plan's behavior → step tree with build detail (acceptance mode, files, notes, status per behavior and step); NOT presented for user review. `N` in every `-step-[N]` artifact name is the behavior number
- `implementation-plan.md` — Full implementation plan (Technical Design + Behaviors); this is the document the user reviews
- `behavior-risks.md` — Implementation-blind behavior-risk catalog (Phase 3b); **frozen** once written
- `loop-state.json` — Loop counter and metadata
- `step-result.md` — Latest BDD batch/behavior result and red/green (or pinned-green) trail
- `quality-result.md` — Latest quality gate result
- `investigation-step-[N].md` — Per-behavior investigation findings
- `investigation-summary.md` — Consolidated investigation results
- `validation-step-[N].md` — Per-behavior conformance validation results (5a)
- `validation-summary.md` — Consolidated conformance results (5a)
- `adversarial-revalidation.md` — Adversarial revalidation findings against the frozen catalog (5b)
- `mutation-plan.md` — Whether the Phase 5c mutation pass runs, and its budget
- `mutants.json` / `mutation-results.md` — Mutation pass inputs and findings (5c)
- `decisions.md` — Running decision log: every point where 2+ viable options existed and one was chosen; read and reported by the summary node
- `commit-plan.md` — Commit strategy, base SHA, and behavior→commit-subject map (see `nodes/commit-protocol.md`)

---

## Phase 0: Clarify Requirements First _(mandatory gate)_

**Before reading a single file, clarify the feature request.**

> **Fundamental Rule: Ask, Don't Assume.**
> Every unconfirmed assumption wastes research effort and invalidates the plan.
> The user always knows more about the requirements than you do.

Ask about **every dimension you're unsure of**:

- **What** should be built: exact behavior, scope boundaries, user-facing vs internal
- **Why** it's needed: reveals hidden constraints and priorities
- **How** edge cases should behave: error states, empty states, boundary conditions
- **What's explicitly out of scope**: don't guess, always confirm
- **Any assumption you're tempted to make**: state it explicitly and ask the user to confirm or correct it

**Do NOT proceed to Phase 1 until the feature is sufficiently understood.** If the user says "just start" without answering critical questions, note the open assumptions in `research-output.md` and flag them at the Phase 1 gate.

---

## Phase 1: Research (Convergence Loop)

Research runs as a loop that **keeps re-running until no code-answerable threads remain**. The orchestrator never reports "more stuff needs checking" to the user — open code-level threads are resolved by another research pass, not by handing them back to the user.

**Round 1 — initial research.** Read the node instructions from `nodes/node-research.md` in this skill's directory, then execute them. The node writes `research-output.md`.

**After completion**, read `research-output.md` and look at **Follow-up Investigations Needed**.

**Round 2+ — targeted follow-ups (loop).** While that section is non-empty:
1. Re-run `nodes/node-research.md` focused on the listed follow-up items only, appending findings to `research-output.md`.
2. Rebuild the "Follow-up Investigations Needed" list from any *new* threads uncovered (drop the resolved ones).
3. Repeat if the list is still non-empty.

**Stop the loop** when "Follow-up Investigations Needed" is empty or after **3 rounds** (safety limit — if still non-empty, note the remaining threads when presenting).

**Then present to the user.** Read the consolidated `research-output.md` and present findings, including only the **Open Questions for the User** (genuine product/requirement decisions).

**Settle the test level here.** Read the `Testing Patterns` block of `research-output.md`. The BDD loop defaults to the **integration level** — real flow, real collaborators, asserted at the client-facing entry point — because a mocked unit test stays green while the wiring, transaction, serialization, or permission check is broken.

- **A harness exists** → note `Test level: integration via <harness>` in the decisions log, and pass the harness, its command, and the example file to mirror into every BDD sub-agent prompt. No question needed.
- **`none found`** → **ask the user now, in the same message as the gate.** This is the cheapest moment: the plan isn't written, so harness setup can still be planned in rather than retrofitted after ten mocked tests. Offer: **stand one up** (name the concrete setup and its cost — it becomes the first steps of the first behavior that needs it, never a heading of its own), **point you at one you missed**, or **accept unit-level for this feature** (wiring goes unverified). Never let a run fall back to mocked unit tests without that answer, and never invent containers or a browser runner unasked.

Record the resolution in the decisions log and pass it to `nodes/node-plan.md`.

**Gate:** Ask the user: "Research complete. Continue to planning, or investigate more?" — plus the test-level question when the verdict was `none found`.
- If "more" → start a new follow-up round with the user's expanded scope as a follow-up item
- **CRITICAL:** You MUST stop and wait for the user's explicit "continue" before proceeding.

---

## Phase 2: Plan

Read the node instructions from `nodes/node-plan.md` in this skill's directory, then execute them.

The plan node loads the `create-implementation-plan` skill to create the plan, reading research output as additional context. `plan-steps.md` mirrors the plan's behavior → step tree, with affected files and dependencies.

**Check the format before presenting.** `implementation-plan.md` must carry `## Technical Design` and `## Behaviors to Implement`, one `### Behavior N` heading per behavior with its checklist (test-first checkboxes, or its steps). A plan shaped as an `AC:` / `Test Type:` step list means the sub-agent never loaded the skill — send it back to a fresh sub-agent rather than presenting it. So does a heading that fails the behavior check in `nodes/node-plan.md` — setup, cleanup or a verification run as its own heading, or a heading with no acceptance check of its own ("no new test", "existing tests stay green") outside the unchanged-outcome mode.

**Gate:** The plan node will request user review of the **`implementation-plan.md`** document (the rich plan with Technical Design + Behaviors), presented as behaviors with their steps nested under them. NEVER present `plan-steps.md` for review — it is derived workflow state for the BDD loop, written only after approval. Do NOT proceed until the user approves.

---

## Phase 3: Investigation

After plan approval, investigate every behavior in the plan sequentially and in deep detail.

### Initialize

Update `loop-state.json`: add `"investigation_step": 1, "investigation_total": [behavior count]`.

### Execute

Read the node instructions from `nodes/node-investigation.md` in this skill's directory, then execute them. The node investigates each behavior, writes per-behavior `investigation-step-[N].md` artifacts, and a consolidated `investigation-summary.md`.

### After Investigation Completes

1. Read `investigation-summary.md` and all `investigation-step-[N].md` artifacts
2. Collect all findings: mismatches, conflicts, missing dependencies, already-implemented behaviors
3. **Fix the plan** — drop already-implemented behaviors, reorder for dependency issues, add gaps (a missing change is a step inside the behavior it serves, not a new heading), resolve conflicts between behaviors — tree changes in `implementation-plan.md` first, then mirrored into `plan-steps.md`
4. **Fold each finding** (files, wrong paths/types/function references, notes) under its matching behavior or step in `plan-steps.md` — the BDD loop reads only that artifact, so a finding left in `investigation-step-[N].md` never reaches the build
5. **Present to the user:** problems found (grouped by category), fixes applied, and the updated plan
6. **Gate:** Wait for user approval of the updated plan before proceeding.

---

## Phase 3b: Behavior-Risk Catalog (implementation-blind, alongside Phase 3)

Runs in the same pre-implementation window as investigation (do it right after dispatching Phase 3, either order — both must finish before Phase 4).

Read the node instructions from `nodes/node-behavior-risk.md` in this skill's directory, then execute them. The node catalogs edge-case **behaviors** from the requirement + existing system only — **never** the new implementation (it does not exist yet, and that timing is exactly the debiasing mechanism: a catalog derived from the implementation only rediscovers the edge cases the implementation already anticipated). It writes `behavior-risks.md`.

### After the Catalog Completes

1. **Escalate requirement-silent entries now** — each is a 2+ defensible-behaviors product decision, cheaper to resolve before implementation than after. Present them to the user. Fold each resolution into `implementation-plan.md` (then mirror it into `plan-steps.md` if it adds a behavior or step); log to `decisions.md`.
2. **Freeze the catalog** — requirement-implied entries become the Phase 5b checks; `behavior-risks.md` is now immutable and must not be revised in any later phase.

**Gate:** if there were silent entries, wait for the user's decisions before Phase 4.

---

## Phase 4: Implementation Loop

The core loop — batched BDD executions alternate with quality gates.

### 4·0. Run-Options Gate — before any code is written

The behavior list is final now (Phase 3b may have added behaviors), so this is the last moment the answers are stable. Ask the user both questions in one message:

**a. How to commit?**

- **One commit per behavior** — each behavior is committed as soon as it goes green, and every later fix (quality gate, conformance, adversarial) is folded back into the commit owning that behavior. The branch ends with exactly one commit per behavior in the plan. Say plainly that folding **rewrites history**, so it is only free while the branch is unpushed.
- **Defer all commits** — the run never touches git; everything accumulates in the working tree and the user commits at the end.

**b. Run the Phase 5c mutation pass?** One budgeted pass that injects defects to prove the tests would catch them. Quote the real trade: on a past run it surfaced **8 false-green tests** the other phases missed, and the budgeted version costs roughly **10-20 minutes**. Default **on** for correctness-critical work (money, data integrity, scoring); **off** for UI/wiring work where a false green is cheap.

Write the commit answer to `commit-plan.md` per `nodes/commit-protocol.md` and the mutation answer to `mutation-plan.md` (`Mutation: on|off`, plus the budget if it differs from the default ≤3 per behavior / ≤30 per run). Log both to `decisions.md`. **Gate:** do not dispatch the first BDD batch until the user has answered both. Pass the commit strategy into every execution from here on.

**Mutation testing happens in Phase 5c or not at all.** No other phase mutates source to check a test — not the BDD loop, not the quality gate, not conformance; they judge sensitivity by reading.

### Initialize

Update `loop-state.json`: set `"current_behavior": 1, "quality_checks": 0, "max_behaviors": 20`.

### 4a. BDD Batch Execution

Read the node instructions from `nodes/node-bdd-step.md` in this skill's directory, then execute them for a **batch** of related behaviors (as many as possible, capped at 4, grouped by shared files/module — same grouping rationale as the Orchestrator Rules). **The execution unit is the behavior:** one node run delivers one behavior and all its steps under its acceptance mode. The batch runs autonomously, one-test-at-a-time, with meaningful-red discipline, and has a **bubble-up contract**: it cannot talk to the user, so on any gate it stops, writes progress to `step-result.md` + `plan-steps.md`, and returns control here.

Route on its return (read `step-result.md`):

- **Batch done, no gate** → run the quality gate (4b), then dispatch the next batch.
- **Stopped at a gate** (no meaningful test possible / 2+ defensible implementation behaviors / unresolved failure) → escalate to the user, log the resolution to `decisions.md`, then re-dispatch the node to resume that batch with the decision baked in. For a meaningful-test gate, the options are: skip the test (still implement), defer the behavior, or make it testable (fixture/seam/mock) — only skip on explicit approval, and record the reason.

**Verify discipline** via the red/green trail in `step-result.md` and `plan-steps.md`, not a prose summary.

### 4b. Quality Gate Check

Read `loop-state.json`. Every **2-3 completed behaviors**, read the node instructions from `nodes/node-quality-gate.md` and execute them. It runs `@test-quality-reviewer` and `@code-refactoring` on recent work and writes `quality-result.md`. Route:

- `quality: "pass"` → dispatch the next BDD batch
- `quality: "needs-fixes"` → fix issues, then re-run the quality gate (**max 2** re-checks per checkpoint)

### 4c. Final Check

If `plan-steps.md` has a `## Final check`, execute `nodes/node-bdd-step.md` once for it after every behavior is done (its Final Check Assignment section). It runs the check and records the result; it changes no code. A failure routes like a stopped gate.

### Loop Termination

Stop when: all planned behaviors are implemented (check against the plan), the user says "stop"/"done", or `current_behavior` exceeds `max_behaviors`.

---

## Phase 5: Verification

After implementation, verify along two independent axes. Both run in this pre-summary window, and both **report only — they never stage, commit, or rebase** (git stays serialized; the fix pass that follows does it).

### 5a. Conformance Validation — "did each behavior match the plan?"

Update `loop-state.json`: add `"validation_step": 1, "validation_total": [completed behavior count]`.

Read the node instructions from `nodes/node-validation.md` in this skill's directory, then execute them. The node validates each completed behavior against the plan (implementation match, test coverage & meaningfulness per the 4 Pillars, cross-behavior consistency, code quality), writing per-behavior `validation-step-[N].md` and a consolidated `validation-summary.md`.

**On return:** read `validation-summary.md`; if any behavior is invalid → fix the issues, then re-validate only those behaviors. Under `per-behavior`, **fold each fix into the commit owning that behavior** per `nodes/commit-protocol.md` — never a new commit.

### 5b. Adversarial Revalidation — "does the code survive the frozen catalog?"

Read the node instructions from `nodes/node-adversarial-revalidation.md` in this skill's directory, then execute them per risk-group (related catalog entries together, capped at 4). It takes the frozen `behavior-risks.md` as ground truth for expected behavior on paths the plan never specified, probes the real implementation, and writes findings to `adversarial-revalidation.md`. It does NOT fix anything.

**On return — report + triage.** Present each `breaks` / `silent-misbehavior` finding with severity; the user decides per finding: **new behavior** (→ back to Phase 4) or **accepted / out-of-scope**. There is no auto-loop back into implementation. Log each decision to `decisions.md`. A fix to an existing behavior folds into that behavior's commit; a genuinely new behavior goes into the plan first, is mirrored into `plan-steps.md`, and earns its own commit — either way the one-commit-per-behavior count holds.

### 5c. Mutation Pass — "would the tests catch a defect at all?"

Only if `mutation-plan.md` says `Mutation: on`. Read the node instructions from `nodes/node-mutation.md` and execute them **alone, after 5a and 5b are both done** — this pass writes to the source tree, so it cannot overlap with passes that read and test it. It builds a budgeted mutant list, runs `nodes/mutation-harness.py` (every mutant scoped to the tests that execute its own file), and writes `mutation-results.md`. It reports survivors and never fixes.

**On return — report + triage**, same shape as 5b: each **false green** is either **work on the behavior it belongs to** (→ back to Phase 4) or **accepted/out-of-scope**. Log each to `decisions.md`.

**Then present combined 5a + 5b + 5c results.**

---

## Phase 6: Summary

Read the node instructions from `nodes/node-summary.md` in this skill's directory, then execute them.

Present the final summary to the user with:

- All behaviors completed (and the Final check result, if the plan has one)
- Test results
- Quality gate outcomes
- Conformance + adversarial verification results
- Files changed
- Key decisions (from `decisions.md` — each 2+-option choice and the option picked)

---

## Error Handling

- If any node fails unexpectedly → write error to an `error.md` artifact, stop, and report to user
- If user wants to skip a phase → mark it skipped in loop-state and proceed
- If context feels bloated → summarize what's done so far, use `task_boundary` to mark a new phase
