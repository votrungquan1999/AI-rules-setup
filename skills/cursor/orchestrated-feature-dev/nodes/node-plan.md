# Node: Plan

Create an execution-ready implementation plan from research findings.

## Input

- `tmp/orchestrated-feature-dev/RESEARCH_OUTPUT.md`

## Workflow

1. Convert research into significant design decisions.
2. Define behavior-based step list (not code tasks).
3. Include dependencies and likely touched files per step.
4. Add quality checkpoint markers every 2-3 steps.
5. Present for user approval before implementation.

## Output

Write:

- `tmp/orchestrated-feature-dev/implementation-plan.md`
- `tmp/orchestrated-feature-dev/PLAN_STEPS.md`

`PLAN_STEPS.md` format:

```markdown
## Step 1: <observable behavior>
- Status: pending
- Depends on: none
- Likely files: ...
```
