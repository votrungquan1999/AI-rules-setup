---
name: create-implementation-plan
description: Create a focused implementation plan with significant design decisions and behavior-based execution steps. Use before non-trivial implementation work.
---

# Create Implementation Plan

Plan first for medium/large tasks so implementation stays predictable.

## When to Use

- Changes span multiple files/systems.
- Requirements include edge-case or architectural choices.
- Refactor/feature touches existing critical behavior.

## Workflow

1. Research relevant code paths and current patterns.
2. Ask clarifying questions for gaps.
3. Define significant design decisions only:
   - data/API shape changes
   - strategy choices and tradeoffs
   - risk areas
4. Convert scope into behavior-based implementation steps.
5. Include a test strategy for each step.
6. Present plan and wait for approval before coding.

## Output Shape

```markdown
## Goal
## Technical Design Decisions
## Behaviors to Implement
## Risks / Open Questions
```

## Guardrails

- Do not list low-level coding minutiae as "design."
- Do not start implementation before user confirms the plan.
- Surface assumptions explicitly.
