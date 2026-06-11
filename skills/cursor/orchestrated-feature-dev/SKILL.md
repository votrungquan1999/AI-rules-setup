---
name: orchestrated-feature-dev
description: Orchestrate end-to-end feature delivery with phased subagent execution, parallel investigation/validation, BDD scenario loops, and quality gates. Use for complex multi-step feature work.
---

# Orchestrated Feature Development

Structured pipeline for large feature delivery using parallelizable phases and explicit quality gates.

## Pipeline

```text
[research] -> [plan] -> [investigation parallel] -> [bdd loop] <-> [quality gate]
                                          -> [validation parallel] -> [summary]
```

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
- `<ws>/IMPLEMENTATION_PROGRESS.md`
- `<ws>/INVESTIGATION_STEP_<N>.md`
- `<ws>/VALIDATION_STEP_<N>.md`

`./tmp/` should be in `.gitignore`; delete `<ws>` once the feature is merged.

## Orchestrator Responsibilities

- Delegate isolation-heavy phases to subagents:
  - research
  - planning
  - investigation
  - quality review
  - validation
  - final summary
- Batch per-step phases: for investigation and validation, group 2-4 related steps (by shared files/module) per subagent instead of one subagent per step. The subagent count scales naturally with plan size — do NOT cram more steps into one agent to keep the count down; too many steps per agent congests its context. Every extra subagent re-reads the same plan and shared files; batching pays that cost once per batch.
- Run BDD scenario steps inline for continuity.
- Route based on state files and gate outcomes.
- Pass the task workspace path `<ws>` to every subagent it spawns.
- Pause for user approval at plan gates. The review artifact is `<ws>/implementation-plan.md` (Technical Design + Behaviors) — never present `<ws>/PLAN_STEPS.md`, which is derived loop state written only after the plan is approved.

## Phase Entry Points

- `nodes/node-research.md`
- `nodes/node-plan.md`
- `nodes/node-investigation.md`
- `nodes/node-bdd-step.md`
- `nodes/node-quality-gate.md`
- `nodes/node-validation.md`
- `nodes/node-summary.md`

## Execution Rules

- Research and planning must converge before coding.
- One behavior/test per BDD scenario step.
- Trigger quality gate every 2-3 completed steps.
- Run investigation and validation batches in parallel; each batch agent processes its steps one at a time and still writes one output file per step.
- If validation finds invalid steps, spawn ONE fix subagent covering all invalid steps (batched), then re-validate only those steps.
- Stop on blocking uncertainty and request user decision.
