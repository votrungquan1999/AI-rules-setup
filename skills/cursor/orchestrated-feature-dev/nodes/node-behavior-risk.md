# Node: Behavior-Risk Catalog

Catalog edge-case **behaviors** that could break, derived from the requirement + existing system — **implementation-blind**. Runs in Phase 3b, parallel with investigation.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## The one rule

You are **implementation-blind**: derive risks only from what the feature must do (the requirement) and how the system behaves today (existing code) — never from the new implementation. There is none yet, and even once there is you must not reason from it. A catalog drawn from the implementation only rediscovers the edge cases it already handles — that is the exact bias this node exists to remove.

Two boundaries:

- **Behavior-level, not code-level.** No null/boundary/concurrency/error-path mechanics. Catalog observable behaviors: "under the new requirement, when situation X arises, what should the system do?"
- **Read existing code only to learn current behavior/invariants** — the contracts, states, and guarantees the change might disturb. Do NOT design the change.

## Input

- `<ws>/implementation-plan.md` — the requirement change and its intended behaviors.
- The **existing** code paths the requirement touches — read only to learn today's behavior and invariants.

## Workflow

Work outward from the requirement + existing system:

1. **Requirement boundaries** — for each new behavior, what happens at the edges of its inputs, states, and preconditions (expressed as behavior, not code).
2. **Existing-invariant collisions** — what does the system guarantee today that this change could quietly violate?
3. **Interaction edges** — where new behavior meets existing behavior, which combinations are unspecified or contradictory?
4. **State/lifecycle transitions** — for each new or changed state, which transitions into/out of it does the requirement leave unaddressed?

For EACH risk, decide: does the requirement **imply** the expected behavior, or is it **silent**?

- **Requirement-implied** → record the expected behavior; becomes a Phase 5b adversarial check.
- **Requirement-silent** → the requirement does not say what should happen; a product decision (2+ defensible behaviors) for the orchestrator to escalate to the user BEFORE implementation.

## Output

Write `<ws>/BEHAVIOR_RISKS.md`. It is **FROZEN** once written — never revise it in a later phase; the frozen, unbiased catalog is what lets 5b test the code against a spec the implementation never saw.

```markdown
# Behavior-Risk Catalog — [feature]

> Implementation-blind. Derived from requirement + existing system. FROZEN.

## R1 — [short behavior-risk title]
- Situation: [the edge-case situation, in behavior terms]
- Origin: requirement-boundary | existing-invariant | interaction-edge | state-transition
- Requirement verdict: implied | silent
- Expected behavior: [what should happen — if implied] | n/a — silent
- If silent — open question: [the product decision to escalate] | n/a
```

Report back to the orchestrator: total risks catalogued, and how many are **requirement-silent** (these need user decisions before Phase 4).
