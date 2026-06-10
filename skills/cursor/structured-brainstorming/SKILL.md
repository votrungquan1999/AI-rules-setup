---
name: structured-brainstorming
description: Run a zoom-out-first brainstorming process with clarification, alternatives, tradeoffs, and iterative narrowing. Use for ambiguous design decisions, architecture options, and planning discussions.
---

# Structured Brainstorming

Use a disciplined brainstorming method that prevents premature implementation.

## When to Use

- Requirements are ambiguous.
- Multiple architectural options exist.
- User asks to "think through" or "explore options."

## Core Method

1. Clarify first, ideate second.
2. Start broad, then zoom in.
3. Generate multiple alternatives at each level.
4. Record tradeoffs and decision criteria.
5. Converge to a recommended direction.

## Workflow

0. **Establish the task workspace (before writing any brainstorm notes).** If a caller gave you a working directory (e.g. `<ws>` = `./tmp/<identifier>/`), use it. Otherwise ask the user for a **task identifier** — a ticket id (e.g. `JIRA-123`) or any short label; if they have none, derive a short kebab-case slug from the topic and **confirm it**. Then `<ws>` = `./tmp/<identifier>/` (create it). Write all brainstorm docs (e.g. `<ws>/brainstorm-<topic>.md`) under it so multiple brainstorms run in parallel without colliding.
1. Write a clear problem statement.
2. Ask clarifying questions:
   - Scope and out-of-scope
   - Constraints
   - Success metrics
   - Non-negotiables and deadlines
3. At each zoom level:
   - Propose 2-3 alternatives
   - Compare pros/cons
   - Decide what to carry forward
4. Summarize:
   - Chosen approach
   - Rejected alternatives and why
   - Risks and open questions

## Output Template

```markdown
## Problem
<statement>

## Constraints
- ...

## Alternatives
### Option A
- Pros:
- Cons:

### Option B
- Pros:
- Cons:

## Recommendation
- Choice:
- Why:
- Risks:
- Next step:
```

## Guardrails

- Do not skip clarification when key details are missing.
- Do not present one option as inevitable unless constraints force it.
