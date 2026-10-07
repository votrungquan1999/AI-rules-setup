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
3. Create the working directory `./tmp/<identifier>/`. **First check whether it already holds artifacts from unrelated work — if so, STOP and ask the user** rather than overwriting another task's run.
4. From here on, `<ws>` = `./tmp/<identifier>/`. Use it as the prefix for every state file, and **include this path in every subagent prompt** ("The task working directory is `<ws>` — read and write all state files there.").

**Gate:** Do NOT start research until the identifier is set, confirmed, and the directory exists.

## State Files

Every run is scoped to its task identifier so **multiple tasks run in parallel** without colliding. All state lives under the per-task workspace `<ws>` = `./tmp/<identifier>/`:

- `<ws>/RESEARCH_OUTPUT.md`
- `<ws>/PLAN_STEPS.md` — the plan's behavior → step tree with build detail; derived workflow state for the BDD loop; NOT presented for user review. `N` in every `_STEP_<N>` file name is the behavior number
- `<ws>/implementation-plan.md` — the rich plan document (Technical Design + Behaviors) the user reviews
- `<ws>/INVESTIGATION_STEP_<N>.md` — per-behavior investigation context
- `<ws>/BEHAVIOR_RISKS.md` — implementation-blind behavior-risk catalog (Phase 3b); **frozen** once written
- `<ws>/IMPLEMENTATION_PROGRESS.md` — per-behavior results + red/green (or pinned-green) audit trail
- `<ws>/VALIDATION_STEP_<N>.md` — conformance results (5a)
- `<ws>/ADVERSARIAL_REVALIDATION.md` — adversarial findings against the frozen catalog (5b)
- `<ws>/MUTATION_PLAN.md` — whether the Phase 5c mutation pass runs, and its budget; `<ws>/MUTANTS.json` + `<ws>/MUTATION_RESULTS.md` — its inputs and findings
- `<ws>/DECISIONS.md` — running decision log: every point where 2+ viable options existed and one was chosen; read and reported by the summary node
- `<ws>/COMMIT_PLAN.md` — commit strategy, base SHA, and behavior→commit-subject map (see `nodes/commit-protocol.md`)

`./tmp/` should be in `.gitignore`; delete `<ws>` once the feature is merged.

## Orchestrator Responsibilities

- Delegate every working phase to a subagent — research, planning, investigation, behavior-risk catalog, BDD, quality review, conformance validation, adversarial revalidation, final summary. The orchestrator only routes; it never does the work itself.
- **Batch to the cap.** For investigation, BDD, and both verification passes, put **as many related behaviors as possible into one subagent, capped at 4** (grouped by shared files/module) — one agent amortizes the shared-context read across its behaviors, but past ~4 its context congests and quality drops. Spawn a phase's batches in a single message so they run in parallel.
- Route based on state files and gate outcomes; relay subagent outputs rather than re-analyzing them.
- **The plan owns the behavior → step tree.** `PLAN_STEPS.md` mirrors `implementation-plan.md` title-for-title (`Behavior N`, `Step N.M`) and only adds build detail. Change a behavior or step in the plan first, then mirror it; after any edit to either file, compare both files' `Behavior N` / `Step N.M` titles and fix any mismatch before routing on — a silent mismatch builds something nobody reviewed.
- **Freeze `BEHAVIOR_RISKS.md`** once Phase 3b writes it — the adversarial pass checks against it, so never edit it to match what was built; that is what keeps 5b an honest test.
- Pass the task workspace path `<ws>` — and the commit strategy — to every subagent it spawns.
- **Serialize git.** Under the `per-behavior` commit strategy, never spawn BDD batches in parallel: concurrent subagents committing to one branch corrupt each other's history, and batches are grouped by *shared files*, so one file's diff cannot be split across behaviors after the fact. Run BDD batches one at a time. Verification (Phase 5) stays parallel because those subagents only report; the single fix subagent does the git work.
- Log decisions: whenever any phase, or the orchestrator itself (e.g. fixing the plan after investigation, resolving a silent catalog entry, a routing choice), faces 2+ defensible options and commits to one — including choices resolved by asking the user — append an entry to `<ws>/DECISIONS.md` (chosen option, alternative(s), one-line why). Skip forced moves where only one option was viable.
- Pause for user approval at plan gates. The review artifact is `<ws>/implementation-plan.md` (Technical Design + Behaviors) — never present `<ws>/PLAN_STEPS.md`, which is derived loop state written only after the plan is approved.
- Check the plan's format before presenting it. `<ws>/implementation-plan.md` must carry `## Technical Design` and `## Behaviors to Implement`, one `### Behavior N` heading per behavior with its checklist (test-first checkboxes, or its steps). A plan shaped as an `AC:` / `Test Type:` step list means the plan subagent never loaded `create-implementation-plan` — send it back to a fresh subagent rather than presenting it. So does a heading that fails the behavior check in `nodes/node-plan.md` — setup, cleanup or a verification run as its own heading, or a heading with no acceptance check of its own ("no new test", "existing tests stay green") outside the unchanged-outcome mode. Present the plan as behaviors with their steps nested under them.

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
- `nodes/node-mutation.md` — mutation pass (5c); runs `nodes/mutation-harness.py`
- `nodes/node-summary.md`
- `nodes/commit-protocol.md` — reference, not a phase: how behaviors become commits and how fixes fold

## Execution Rules

- Research and planning must converge before coding.
- **Settle the test level at the research gate**, from the `Testing Patterns` block of `RESEARCH_OUTPUT.md`. The BDD loop defaults to the **integration level** — real flow, real collaborators, asserted at the client-facing entry point — because a mocked unit test stays green while the wiring, transaction, serialization, or permission check is broken. A harness exists → record `Test level: integration via <harness>` in `DECISIONS.md` and pass the harness, its command, and the example file into every BDD subagent prompt. `none found` → **ask the user in the same message as the gate**, while the plan is still unwritten and harness setup can be planned in rather than retrofitted: **stand one up** (name the setup and its cost — it becomes the first steps of the first behavior that needs it, never a heading of its own), **point you at one you missed**, or **accept unit-level for this feature** (wiring unverified). Never fall back to mocked unit tests unasked; never invent containers or a browser runner. Pass the resolution to `node-plan.md`.
- **Behavior-risk catalog (Phase 3b)** runs parallel with investigation (spawn it in the same message). It is implementation-blind — cataloguing edge-case behaviors from the requirement + existing system only. On return: escalate every **requirement-silent** entry to the user as a product decision (2+ defensible behaviors) **before** implementation, fold each resolution into `implementation-plan.md` (then mirror it into `PLAN_STEPS.md` if it adds a behavior or step) and `DECISIONS.md`, then **freeze** the catalog — requirement-implied entries become the Phase 5b checks.
- **Investigation (Phase 3) return:** fix the plan — drop already-done behaviors, reorder for deps, add gaps (a missing change is a step inside the behavior it serves, not a new heading), resolve conflicts — tree changes in `implementation-plan.md` first, then mirrored. Fold each finding (files, wrong paths/types, notes) under its matching behavior or `Step N.M` in `PLAN_STEPS.md`, the file the BDD loop builds from, so no finding is stranded away from the step it changes.
- **Ask two run options before any code is written** (after Phase 3b, when the behavior list is final — the last moment the answers are stable), in one message. **(a) How to commit:** **one commit per behavior** (committed as it goes green, every later fix folded back into its owning commit, so the branch ends with exactly one commit per behavior — say plainly that folding **rewrites history**, so it is only free while the branch is unpushed), or **defer all commits** (never touch git; the user commits at the end). **(b) Run the Phase 5c mutation pass?** One budgeted pass that injects defects to prove the tests catch them — on a past run it surfaced **8 false-green tests** the other phases missed, for roughly **10-20 minutes**; default **on** for correctness-critical work (money, data integrity, scoring), **off** for UI/wiring. Write the answers to `<ws>/COMMIT_PLAN.md` per `nodes/commit-protocol.md` and `<ws>/MUTATION_PLAN.md` (`Mutation: on|off` + budget if not the default ≤3 per behavior / ≤30 per run), log both to `DECISIONS.md`. **Gate:** do not spawn the first BDD batch until the user has answered both.
- **The execution unit is the behavior:** one BDD node run delivers one behavior and all its steps under its acceptance mode, one test at a time.
- **BDD runs as batched subagents, NOT inline** (same grouping/cap as investigation). Each batch runs autonomously with one-test-at-a-time meaningful-red discipline, but a batch subagent cannot talk to the user — so on any gate (no meaningful test possible / 2+ defensible behaviors / unresolved failure) it **BUBBLES UP**: stops, writes progress, returns control. The orchestrator escalates to the user, logs to `DECISIONS.md`, then spawns a **fresh** subagent to resume that batch with the decision baked in. Verify discipline via the red/green trail in `IMPLEMENTATION_PROGRESS.md`, not the prose summary.
- Trigger quality gate every 2-3 completed behaviors; `needs-fixes` → fix subagent, re-check (max 2 per checkpoint).
- **Final check** — if `PLAN_STEPS.md` has a `## Final check`, spawn one `node-bdd-step.md` subagent for it once every behavior is done. It runs the check and records the result; it changes no code. A failure routes like a stopped gate.
- **Verification (Phase 5)** splits into two parallel passes, spawned together. Both **report only — they never stage, commit, or rebase** (they run in parallel; git stays serialized):
  - **5a Conformance Validation** ("did each behavior match the plan?") — `node-validation.md` per behavior-batch, one output file per behavior. Invalid behaviors → ONE fix subagent covering all, then re-validate only those. Under `per-behavior`, that fix subagent **folds each fix into the commit owning that behavior** per `nodes/commit-protocol.md` — never a new commit.
  - **5b Adversarial Revalidation** ("does the code survive the frozen catalog?") — `node-adversarial-revalidation.md` per risk-group. On return, **report + triage with the user**: each break/silent-misbehavior is either a **new behavior** (→ back to BDD) or **accepted/out-of-scope**. No auto-loop into implementation; log each to `DECISIONS.md`. A fix to an existing behavior folds into that behavior's commit; a genuinely new behavior goes into the plan first, is mirrored into `PLAN_STEPS.md`, and earns its own commit — either way the one-commit-per-behavior count holds.
  - **5c Mutation pass** (only if `MUTATION_PLAN.md` says `on`) — `node-mutation.md` as a **single subagent, alone, after 5a and 5b return**: it writes to the source tree, so it cannot overlap with passes that read and test it. Every mutant names only the tests that execute the mutated file (the harness rejects one with no `tests` list) — a run that passed all 9 target files to all 96 mutants burned 62 minutes for 8 findings. It reports survivors and never fixes; triage each false green with the user like a 5b finding.
- **Mutation testing happens in Phase 5c or not at all.** No other phase mutates source to check a test — not the BDD loop, not the quality gate, not conformance; they judge sensitivity by reading. Never write mutation instructions into a subagent prompt yourself.
- Stop on blocking uncertainty and request user decision.
