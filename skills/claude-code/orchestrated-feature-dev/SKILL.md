---
name: orchestrated-feature-dev
description: Orchestrated feature development with sub-agent phases, quality gate loops, and structured pipeline. Use when asked for "orchestrated development", "structured feature build", "deep feature workflow", or "full development pipeline".
---

# Orchestrated Feature Development

A structured workflow that orchestrates specialized node phases through a pipeline with quality gate loops. Each phase runs as a **sub-agent** with isolated context, keeping the main session clean.

## How This Works

This skill acts as an **orchestrator** — it spawns sub-agents for each phase using the `Task` tool, passes data between them via project-local files, and makes routing decisions based on results.

```
[research] → [plan] → [tdd-step] ↔ [quality-gate] → [summary]
                           ↑              |
                           └── loop back ──┘
```

## Sub-Agent Architecture

Each phase runs as a sub-agent spawned via the `Task` tool. This provides:
- **Isolated context** — each phase gets a clean context window, preventing bloat
- **Focused execution** — sub-agents only see their node instructions and relevant state files
- **Clean summaries** — only the results are returned to the orchestrator

**How to spawn a phase sub-agent:**

Use the `Task` tool with the following pattern:
```
Task(
  description: "Read the instructions in [path to node file] and execute them. 
    [Additional context: user request, relevant state files to read, etc.]
    When done, report: [what the orchestrator needs to know]"
)
```

The sub-agent will execute the node instructions and return a summary. The orchestrator then reads the state files and makes routing decisions.

## State Files Convention

All workflow state is tracked in project-local files (add to `.gitignore`):

- `RESEARCH_OUTPUT.md` — Research findings (written by research node)
- `PLAN_STEPS.md` — Step list for the TDD loop (written by plan node)
- `IMPLEMENTATION_PROGRESS.md` — Progress tracking with test results (written by TDD step node)

---

## Phase 1: Research Node

**Spawn a sub-agent** to run the research phase:

```
Task("Read the instructions in [this skill's directory]/nodes/node-research.md 
  and execute them for the following feature request: [user's request].
  Write findings to RESEARCH_OUTPUT.md in the project root.
  Report back: number of files read, key patterns found, affected areas.")
```

**After the sub-agent returns**, read the `RESEARCH_OUTPUT.md` file and present findings to the user.

**Gate:** Ask the user: "Research complete. Is this information enough to continue? Read more files, ask questions, or continue?"
- If "more files" → spawn another research sub-agent with expanded scope
- If user has questions → answer them and wait for further instruction
- **CRITICAL:** You MUST stop execution here and wait for the user's response. Do NOT proceed to Phase 2 until the user explicitly says "continue with implementation plan" or "continue".

---

## Phase 2: Plan Node

**Spawn a sub-agent** to run the planning phase:

```
Task("Read the instructions in [this skill's directory]/nodes/node-plan.md
  and execute them. Read RESEARCH_OUTPUT.md for context.
  Use @create-implementation-plan to create the plan.
  Write the step list to PLAN_STEPS.md.
  Report back: the plan summary and number of planned steps.")
```

**After the sub-agent returns**, present the plan for user review.

**Gate:** Do NOT proceed until the user approves the plan.

---

## Phase 3: Implementation Loop

This is the core loop — it alternates between TDD steps and quality gates.

### For Each Step

**3a. TDD Step Node**

**Spawn a sub-agent** for each TDD step:

```
Task("Read the instructions in [this skill's directory]/nodes/node-tdd-step.md
  and execute them. Read PLAN_STEPS.md to find the next pending step.
  Update PLAN_STEPS.md and IMPLEMENTATION_PROGRESS.md when done.
  Report back: which behavior was implemented, test result, any regressions.")
```

**After the sub-agent returns**, check the report:
- If step succeeded → continue
- If step had issues → ask user for guidance before continuing

**3b. Quality Gate Check**

Every **2-3 completed steps**, **spawn a sub-agent** for the quality gate:

```
Task("Read the instructions in [this skill's directory]/nodes/node-quality-gate.md
  and execute them. Review tests and code from the most recent 2-3 steps.
  Report back: quality score, issues found, issues fixed, pass/needs-fixes.")
```

**After the sub-agent returns**, route based on quality result:
- If `quality: "pass"` → continue to next TDD step
- If `quality: "needs-fixes"` → spawn another sub-agent to fix, then re-check
- **Max 2 quality re-checks** per checkpoint to prevent infinite loops

### Loop Termination

Stop the implementation loop when:
- All planned behaviors are implemented (check against the plan)
- User explicitly says "stop" or "done"
- Step count exceeds 20 (safety limit)

---

## Phase 4: Summary Node

**Spawn a sub-agent** for the final summary:

```
Task("Read the instructions in [this skill's directory]/nodes/node-summary.md
  and execute them. Read RESEARCH_OUTPUT.md, PLAN_STEPS.md, and 
  IMPLEMENTATION_PROGRESS.md. Run the full test suite and linting.
  Report back: complete summary with steps, quality gates, test results, files changed.")
```

Present the final summary to the user.

---

## Error Handling

- If any sub-agent fails → report the error to the user and ask how to proceed
- If user wants to skip a phase → mark it skipped and proceed
- Keep `IMPLEMENTATION_PROGRESS.md` updated so work survives interruptions
- If a sub-agent's context is too large (very complex phase) → break it into multiple smaller sub-agents

## Related Skills

- `@create-implementation-plan` - Used in Phase 2 for plan creation
- `@tdd-design` - Core TDD methodology used in Phase 3
- `@test-quality-reviewer` - Used in quality gate checks
- `@code-refactoring` - Used in quality gate reviews
- `@context7` - Used for library documentation during research
- `@web-search` - Used for broader research during Phase 1
