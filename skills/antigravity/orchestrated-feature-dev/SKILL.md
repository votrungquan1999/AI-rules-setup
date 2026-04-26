---
name: orchestrated-feature-dev
description: N8N-style orchestrated feature development with specialized node skills, conditional routing, and quality gate loops. Use when asked for "orchestrated development", "structured feature build", or "deep feature workflow".
---

# Orchestrated Feature Development

An n8n-style workflow that orchestrates specialized node skills through a structured pipeline with conditional routing and reflection loops. The main session is the **orchestrator only** — it manages artifacts and routing, never performs research, implementation, or analysis itself.

## How This Works

This skill acts as an **orchestrator** — it sequences specialized node skills, passes data between them via artifact files, and makes routing decisions based on results. Each node reads from and writes to the Antigravity artifact directory (`<appDataDir>/brain/<conversation-id>/`).

```
[research] → [plan] → [investigation] → [tdd-step] ↔ [quality-gate] → [validation] → [summary]
                            ↑                 ↑              |
                            fix plan          └── loop back ──┘
```

## Orchestrator Rules

The main session MUST:
- **Only manage artifacts and routing** — never read code, analyze findings, or write implementation
- **Execute node instructions** for all research, planning, investigation, implementation, and validation work
- **Read state artifacts** only to make routing decisions (pass/fail, next step, done/not done)
- **Present node outputs** to the user by reading and relaying their output artifacts
- **Fix state artifacts** when investigation reveals plan issues (update `plan-steps.md` and `implementation-plan.md`)

The main session MUST NOT:
- Read source code files directly (outside of node execution)
- Analyze or summarize research findings in its own words
- Write any implementation or test code (outside of node execution)
- Make judgment calls about code quality — delegate to nodes

## Artifact Convention

All workflow state files are created as Antigravity artifacts in the brain directory for the current conversation. Use `write_to_file` with `IsArtifact: true` to create/update these files. The artifact directory path is provided to you at the start of each conversation.

**Workflow artifacts:**

- `research-output.md` — Research findings
- `plan-steps.md` — Step list with affected files and dependencies
- `implementation-plan.md` — Full implementation plan
- `loop-state.json` — Loop counter and metadata
- `step-result.md` — Latest TDD step result
- `quality-result.md` — Latest quality gate result
- `investigation-step-[N].md` — Per-step investigation findings
- `investigation-summary.md` — Consolidated investigation results
- `validation-step-[N].md` — Per-step validation results
- `validation-summary.md` — Consolidated validation results

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

## Phase 1: Research

Read the node instructions from `nodes/node-research.md` in this skill's directory, then execute them.

**After completion**, read the `research-output.md` artifact and present findings to the user.

**Gate:** Ask the user: "Research complete. Continue to planning, or investigate more?"
- If "more" → re-run this phase with expanded scope
- **CRITICAL:** You MUST stop and wait for the user's explicit "continue" before proceeding.

---

## Phase 2: Plan

Read the node instructions from `nodes/node-plan.md` in this skill's directory, then execute them.

The plan node will use `@create-implementation-plan` to create the plan, reading research output as additional context. The step list must include affected files and dependencies per step.

**Gate:** The plan node will request user review. Do NOT proceed until the user approves.

---

## Phase 3: Investigation

After plan approval, investigate every step in the plan sequentially and in deep detail.

### Initialize

Update `loop-state.json`: add `"investigation_step": 1, "investigation_total": [step count]`.

### Execute

Read the node instructions from `nodes/node-investigation.md` in this skill's directory, then execute them.

The investigation node will:
1. Investigate each step sequentially with full plan context
2. Check affected files, existing implementations, conflicts, mismatches, dependencies, edge cases
3. Write per-step findings to `investigation-step-[N].md` artifacts
4. Write a consolidated `investigation-summary.md` artifact

### After Investigation Completes

1. Read `investigation-summary.md` and all `investigation-step-[N].md` artifacts
2. Collect all findings: mismatches, conflicts, missing dependencies, already-implemented steps
3. **Fix the plan** — update `plan-steps.md` and `implementation-plan.md` to address:
   - Remove steps for behaviors already implemented
   - Fix file paths, type names, or function references that were wrong
   - Reorder steps if dependency issues were found
   - Add missing steps if gaps were identified
   - Resolve conflicts between steps
4. **Present to the user:**
   - What problems were found (grouped by category: already implemented, mismatches, conflicts, missing deps, edge cases)
   - What fixes were applied to the plan
   - The updated plan
5. **Gate:** Wait for user approval of the updated plan before proceeding.

---

## Phase 4: Implementation Loop

This is the core loop — it alternates between TDD steps and quality gates.

### Initialize

Update `loop-state.json`: set `"current_step": 1, "quality_checks": 0, "max_steps": 20`.

### For Each Step

**4a. TDD Step Node**

Read the node instructions from `nodes/node-tdd-step.md` in this skill's directory, then execute them.

The node will:

1. Determine the next observable behavior to implement
2. Write a test for it
3. Run the test (MUST see result before implementing)
4. Implement if test failed; skip if test already passes
5. Write the step result to the `step-result.md` artifact

**After completion**, read `step-result.md` and decide:

- If step succeeded → increment `current_step` in `loop-state.json`
- If step had issues → ask user for guidance before continuing

**4b. Quality Gate Check**

Read `loop-state.json`. Every **2-3 completed steps**, trigger the quality gate:

Read the node instructions from `nodes/node-quality-gate.md` in this skill's directory, then execute them.

The quality gate will:

1. Run `@test-quality-reviewer` on recent tests
2. Run `@code-refactoring` review on recent implementation
3. Write findings to the `quality-result.md` artifact

**After completion**, read `quality-result.md` and route:

- If `quality: "pass"` → continue to next TDD step
- If `quality: "needs-fixes"` → fix issues, then re-run quality gate
- **Max 2 quality re-checks** per checkpoint to prevent infinite loops

### Loop Termination

Stop the implementation loop when:

- All planned behaviors are implemented (check against the plan)
- User explicitly says "stop" or "done"
- `current_step` exceeds `max_steps` (safety limit)

---

## Phase 5: Validation

After all implementation steps are complete, validate every completed step sequentially.

### Initialize

Update `loop-state.json`: add `"validation_step": 1, "validation_total": [completed step count]`.

### Execute

Read the node instructions from `nodes/node-validation.md` in this skill's directory, then execute them.

The validation node will:
1. Validate each completed step sequentially with full plan and implementation context
2. Check implementation vs plan, test coverage, cross-step consistency, code quality
3. Write per-step findings to `validation-step-[N].md` artifacts
4. Write a consolidated `validation-summary.md` artifact

### After Validation Completes

1. Read `validation-summary.md`
2. If any step is invalid → fix the issues, then re-validate those steps
3. Present validation results to the user

---

## Phase 6: Summary

Read the node instructions from `nodes/node-summary.md` in this skill's directory, then execute them.

Present the final summary to the user with:

- All steps completed
- Test results
- Quality gate outcomes
- Validation results
- Files changed

---

## Error Handling

- If any node fails unexpectedly → write error to an `error.md` artifact, stop, and report to user
- If user wants to skip a phase → mark it skipped in loop-state and proceed
- If context feels bloated → summarize what's done so far, use `task_boundary` to mark a new phase
