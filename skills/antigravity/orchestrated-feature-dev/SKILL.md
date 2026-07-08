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
- **Batch to the cap.** For the BDD phase (and the adversarial verification pass), a node execution takes **as many related steps as possible, capped at 4** (grouped by shared files/module) — one execution amortizes the shared-context read across its steps, but past ~4 the context congests and quality drops.
- **Read state artifacts** only to make routing decisions (pass/fail, next step, done/not done)
- **Present node outputs** to the user by reading and relaying their output artifacts. Nodes never talk to the user — they write artifacts and return control; the orchestrator owns every user-facing escalation.
- **Fix state artifacts** when investigation reveals plan issues (update `plan-steps.md` and `implementation-plan.md`)
- **Freeze `behavior-risks.md`** once Phase 3b writes it — the adversarial pass checks the built code against it, so it must never be edited to match what was built.
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
- `plan-steps.md` — Derived workflow state for the BDD loop (step list with affected files and dependencies); NOT presented for user review
- `implementation-plan.md` — Full implementation plan (Technical Design + Behaviors); this is the document the user reviews
- `behavior-risks.md` — Implementation-blind behavior-risk catalog (Phase 3b); **frozen** once written
- `loop-state.json` — Loop counter and metadata
- `step-result.md` — Latest BDD batch/step result and red/green trail
- `quality-result.md` — Latest quality gate result
- `investigation-step-[N].md` — Per-step investigation findings
- `investigation-summary.md` — Consolidated investigation results
- `validation-step-[N].md` — Per-step conformance validation results (5a)
- `validation-summary.md` — Consolidated conformance results (5a)
- `adversarial-revalidation.md` — Adversarial revalidation findings against the frozen catalog (5b)
- `decisions.md` — Running decision log: every point where 2+ viable options existed and one was chosen; read and reported by the summary node

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

**Gate:** Ask the user: "Research complete. Continue to planning, or investigate more?"
- If "more" → start a new follow-up round with the user's expanded scope as a follow-up item
- **CRITICAL:** You MUST stop and wait for the user's explicit "continue" before proceeding.

---

## Phase 2: Plan

Read the node instructions from `nodes/node-plan.md` in this skill's directory, then execute them.

The plan node will use `@create-implementation-plan` to create the plan, reading research output as additional context. The step list must include affected files and dependencies per step.

**Gate:** The plan node will request user review of the **`implementation-plan.md`** document (the rich plan with Technical Design + Behaviors). NEVER present `plan-steps.md` for review — it is derived workflow state for the BDD loop, written only after approval. Do NOT proceed until the user approves.

---

## Phase 3: Investigation

After plan approval, investigate every step in the plan sequentially and in deep detail.

### Initialize

Update `loop-state.json`: add `"investigation_step": 1, "investigation_total": [step count]`.

### Execute

Read the node instructions from `nodes/node-investigation.md` in this skill's directory, then execute them. The node investigates each step, writes per-step `investigation-step-[N].md` artifacts, and a consolidated `investigation-summary.md`.

### After Investigation Completes

1. Read `investigation-summary.md` and all `investigation-step-[N].md` artifacts
2. Collect all findings: mismatches, conflicts, missing dependencies, already-implemented steps
3. **Fix the plan** — update `plan-steps.md` and `implementation-plan.md`: remove already-implemented steps, fix wrong file paths/type/function references, reorder for dependency issues, add missing steps, resolve conflicts between steps
4. **Present to the user:** problems found (grouped by category), fixes applied, and the updated plan
5. **Gate:** Wait for user approval of the updated plan before proceeding.

---

## Phase 3b: Behavior-Risk Catalog (implementation-blind, alongside Phase 3)

Runs in the same pre-implementation window as investigation (do it right after dispatching Phase 3, either order — both must finish before Phase 4).

Read the node instructions from `nodes/node-behavior-risk.md` in this skill's directory, then execute them. The node catalogs edge-case **behaviors** from the requirement + existing system only — **never** the new implementation (it does not exist yet, and that timing is exactly the debiasing mechanism: a catalog derived from the implementation only rediscovers the edge cases the implementation already anticipated). It writes `behavior-risks.md`.

### After the Catalog Completes

1. **Escalate requirement-silent entries now** — each is a 2+ defensible-behaviors product decision, cheaper to resolve before implementation than after. Present them to the user. Fold each resolution into `implementation-plan.md` (+ a `plan-steps.md` step if it adds behavior); log to `decisions.md`.
2. **Freeze the catalog** — requirement-implied entries become the Phase 5b checks; `behavior-risks.md` is now immutable and must not be revised in any later phase.

**Gate:** if there were silent entries, wait for the user's decisions before Phase 4.

---

## Phase 4: Implementation Loop

The core loop — batched BDD executions alternate with quality gates.

### Initialize

Update `loop-state.json`: set `"current_step": 1, "quality_checks": 0, "max_steps": 20`.

### 4a. BDD Batch Execution

Read the node instructions from `nodes/node-bdd-step.md` in this skill's directory, then execute them for a **batch** of related steps (as many as possible, capped at 4, grouped by shared files/module — same grouping rationale as the Orchestrator Rules). The batch runs autonomously, one-test-at-a-time, with meaningful-red discipline, and has a **bubble-up contract**: it cannot talk to the user, so on any gate it stops, writes progress to `step-result.md` + `plan-steps.md`, and returns control here.

Route on its return (read `step-result.md`):

- **Batch done, no gate** → run the quality gate (4b), then dispatch the next batch.
- **Stopped at a gate** (no meaningful test possible / 2+ defensible implementation behaviors / unresolved failure) → escalate to the user, log the resolution to `decisions.md`, then re-dispatch the node to resume that batch with the decision baked in. For a meaningful-test gate, the options are: skip the test (still implement), defer the behavior, or make it testable (fixture/seam/mock) — only skip on explicit approval, and record the reason.

**Verify discipline** via the red/green trail in `step-result.md` and `plan-steps.md`, not a prose summary.

### 4b. Quality Gate Check

Read `loop-state.json`. Every **2-3 completed steps**, read the node instructions from `nodes/node-quality-gate.md` and execute them. It runs `@test-quality-reviewer` and `@code-refactoring` on recent work and writes `quality-result.md`. Route:

- `quality: "pass"` → dispatch the next BDD batch
- `quality: "needs-fixes"` → fix issues, then re-run the quality gate (**max 2** re-checks per checkpoint)

### Loop Termination

Stop when: all planned behaviors are implemented (check against the plan), the user says "stop"/"done", or `current_step` exceeds `max_steps`.

---

## Phase 5: Verification

After implementation, verify along two independent axes. Both run in this pre-summary window.

### 5a. Conformance Validation — "did each step match the plan?"

Update `loop-state.json`: add `"validation_step": 1, "validation_total": [completed step count]`.

Read the node instructions from `nodes/node-validation.md` in this skill's directory, then execute them. The node validates each completed step against the plan (implementation match, test coverage & meaningfulness per the 4 Pillars, cross-step consistency, code quality), writing per-step `validation-step-[N].md` and a consolidated `validation-summary.md`.

**On return:** read `validation-summary.md`; if any step is invalid → fix the issues, then re-validate only those steps.

### 5b. Adversarial Revalidation — "does the code survive the frozen catalog?"

Read the node instructions from `nodes/node-adversarial-revalidation.md` in this skill's directory, then execute them per risk-group (related catalog entries together, capped at 4). It takes the frozen `behavior-risks.md` as ground truth for expected behavior on paths the plan never specified, probes the real implementation, and writes findings to `adversarial-revalidation.md`. It does NOT fix anything.

**On return — report + triage.** Present each `breaks` / `silent-misbehavior` finding with severity; the user decides per finding: **new step** (→ back to Phase 4) or **accepted / out-of-scope**. There is no auto-loop back into implementation. Log each decision to `decisions.md`.

**Then present combined 5a + 5b results.**

---

## Phase 6: Summary

Read the node instructions from `nodes/node-summary.md` in this skill's directory, then execute them.

Present the final summary to the user with:

- All steps completed
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
