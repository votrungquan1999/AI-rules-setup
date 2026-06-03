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

## State Files

Use project-local state under `tmp/orchestrated-feature-dev/`:

- `RESEARCH_OUTPUT.md`
- `PLAN_STEPS.md` — derived workflow state for the BDD loop; NOT presented for user review
- `implementation-plan.md` — the rich plan document (Technical Design + Behaviors) the user reviews
- `IMPLEMENTATION_PROGRESS.md`
- `INVESTIGATION_STEP_<N>.md`
- `VALIDATION_STEP_<N>.md`

## Orchestrator Responsibilities

- Delegate isolation-heavy phases to subagents:
  - research
  - planning
  - investigation
  - quality review
  - validation
  - final summary
- Run BDD scenario steps inline for continuity.
- Route based on state files and gate outcomes.
- Pause for user approval at plan gates. The review artifact is `implementation-plan.md` (Technical Design + Behaviors) — never present `PLAN_STEPS.md`, which is derived loop state written only after the plan is approved.

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
- Run investigation and validation in parallel when steps are independent.
- Stop on blocking uncertainty and request user decision.
