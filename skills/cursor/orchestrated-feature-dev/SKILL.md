---
name: orchestrated-feature-dev
description: Orchestrate end-to-end feature delivery with phased subagent execution — research, plan, parallel investigation + implementation-blind behavior-risk catalog, batched BDD, and conformance + adversarial verification — under quality gates and human-approval loops. Use for large or high-stakes multi-step feature work; overkill for quick edits.
---

# Orchestrated Feature Development

Structured pipeline for large feature delivery using parallelizable phases and explicit quality gates. The orchestrator delegates every working phase to a subagent (it does none of the work itself), passes data through state files under `<ws>`, and routes on what each subagent returns.

## Pipeline

research → plan → (investigation ∥ behavior-risk catalog) → BDD-batch ↔ quality-gate → (conformance ∥ adversarial verification) → summary

## Phase 0: Establish Task Workspace

**Before writing any notes, spawning any subagent, or creating any artifact**, establish the task identifier and working directory — this is the very first step.

1. Ask the user for a **task identifier** — a ticket id (e.g. `JIRA-123`, `LINEAR-456`) or any short label for this work.
2. If the user has none, **derive a short kebab-case slug** from the feature request (e.g. `add-trending-markets`) and **confirm it** before proceeding.
3. Create the working directory `./tmp/<identifier>/`.
4. From here on, `<ws>` = `./tmp/<identifier>/`. Use it as the prefix for every state file, and **include this path in every subagent prompt** ("The task working directory is `<ws>` — read and write all state files there.").

**Gate:** Do NOT start research until the identifier is set, confirmed, and the directory exists.

## State Files

Every run is scoped to its task identifier so **multiple tasks run in parallel** without colliding. All state lives under the per-task workspace `<ws>` = `./tmp/<identifier>/`:

- `<ws>/RESEARCH_OUTPUT.md`
- `<ws>/PLAN_STEPS.md` — derived workflow state for the BDD loop; NOT presented for user review
- `<ws>/implementation-plan.md` — the rich plan document (Technical Design + Behaviors) the user reviews
- `<ws>/INVESTIGATION_STEP_<N>.md`
- `<ws>/BEHAVIOR_RISKS.md` — implementation-blind behavior-risk catalog (Phase 3b); **frozen** once written
- `<ws>/IMPLEMENTATION_PROGRESS.md`
- `<ws>/VALIDATION_STEP_<N>.md` — conformance results (5a)
- `<ws>/ADVERSARIAL_REVALIDATION.md` — adversarial findings against the frozen catalog (5b)
- `<ws>/DECISIONS.md` — running decision log: every point where 2+ viable options existed and one was chosen; read and reported by the summary node

`./tmp/` should be in `.gitignore`; delete `<ws>` once the feature is merged.

## Orchestrator Responsibilities

- Delegate every working phase to a subagent — research, planning, investigation, behavior-risk catalog, BDD, quality review, conformance validation, adversarial revalidation, final summary. The orchestrator only routes; it never does the work itself.
- **Batch to the cap.** For investigation, BDD, and both verification passes, put **as many related steps as possible into one subagent, capped at 4** (grouped by shared files/module) — one agent amortizes the shared-context read across its steps, but past ~4 its context congests and quality drops. Spawn a phase's batches in a single message so they run in parallel.
- Route based on state files and gate outcomes; relay subagent outputs rather than re-analyzing them.
- **Freeze `BEHAVIOR_RISKS.md`** once Phase 3b writes it — the adversarial pass checks against it, so never edit it to match what was built; that is what keeps 5b an honest test.
- Pass the task workspace path `<ws>` to every subagent it spawns.
- Log decisions: whenever any phase, or the orchestrator itself (e.g. fixing the plan after investigation, resolving a silent catalog entry, a routing choice), faces 2+ defensible options and commits to one — including choices resolved by asking the user — append an entry to `<ws>/DECISIONS.md` (chosen option, alternative(s), one-line why). Skip forced moves where only one option was viable.
- Pause for user approval at plan gates. The review artifact is `<ws>/implementation-plan.md` (Technical Design + Behaviors) — never present `<ws>/PLAN_STEPS.md`, which is derived loop state written only after the plan is approved.

Spawn prompts stay minimal — the node file carries the instructions: "Read `nodes/node-X.md` and execute it for [assignment]. Task working directory is `<ws>`. Report back: [what the orchestrator needs to route]."

## Phase Entry Points

- `nodes/node-research.md`
- `nodes/node-plan.md`
- `nodes/node-investigation.md`
- `nodes/node-behavior-risk.md`
- `nodes/node-bdd-step.md`
- `nodes/node-quality-gate.md`
- `nodes/node-validation.md` — conformance (5a)
- `nodes/node-adversarial-revalidation.md` — adversarial (5b)
- `nodes/node-summary.md`

## Execution Rules

- Research and planning must converge before coding.
- **Behavior-risk catalog (Phase 3b)** runs parallel with investigation (spawn it in the same message). It is implementation-blind — cataloguing edge-case behaviors from the requirement + existing system only. On return: escalate every **requirement-silent** entry to the user as a product decision (2+ defensible behaviors) **before** implementation, fold each resolution into `implementation-plan.md` (+ a `PLAN_STEPS.md` step if it adds behavior) and `DECISIONS.md`, then **freeze** the catalog — requirement-implied entries become the Phase 5b checks.
- One behavior/test per BDD scenario step.
- **BDD runs as batched subagents, NOT inline** (same grouping/cap as investigation). Each batch runs autonomously with one-test-at-a-time meaningful-red discipline, but a batch subagent cannot talk to the user — so on any gate (no meaningful test possible / 2+ defensible behaviors / unresolved failure) it **BUBBLES UP**: stops, writes progress, returns control. The orchestrator escalates to the user, logs to `DECISIONS.md`, then spawns a **fresh** subagent to resume that batch with the decision baked in. Verify discipline via the red/green trail in `IMPLEMENTATION_PROGRESS.md`, not the prose summary.
- Trigger quality gate every 2-3 completed steps; `needs-fixes` → fix subagent, re-check (max 2 per checkpoint).
- **Verification (Phase 5)** splits into two parallel passes, spawned together:
  - **5a Conformance Validation** ("did each step match the plan?") — `node-validation.md` per step-batch, one output file per step. Invalid steps → ONE fix subagent covering all, then re-validate only those.
  - **5b Adversarial Revalidation** ("does the code survive the frozen catalog?") — `node-adversarial-revalidation.md` per risk-group. On return, **report + triage with the user**: each break/silent-misbehavior is either a **new step** (→ back to BDD) or **accepted/out-of-scope**. No auto-loop into implementation; log each to `DECISIONS.md`.
- Stop on blocking uncertainty and request user decision.
