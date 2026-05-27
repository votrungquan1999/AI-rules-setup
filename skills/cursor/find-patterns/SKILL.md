---
name: find-patterns
description: Extract established codebase patterns for architecture, testing, or data access using targeted exploration and evidence. Use when user asks how the repo usually does something.
---

# Find Patterns

Discover and document **existing** project conventions before introducing new ones.

## When to Use

- "How do we do X in this repo?"
- Need pattern examples before implementing.
- Evaluating consistency across modules.

## Workflow

1. Define target pattern:
   - testing
   - architecture
   - data access
   - error handling
2. Search for representative files.
3. Read 2-5 strong exemplars deeply.
4. Extract repeated structure:
   - imports and dependencies
   - naming and file layout
   - error handling style
   - test setup and assertions
5. Validate pattern appears across multiple files (not one-off code).
6. Summarize pattern and how to apply it.

## Output Template

```markdown
## Pattern: <name>
- Where observed: <files/modules>
- Core structure: <repeated elements>
- Use when: <conditions>
- Avoid when: <counter-cases>
- Minimal example: <skeleton>
```

## Guardrails

- Do not infer from a single file.
- Do not replace evidence with generic best practices.
- Call out conflicting patterns if the codebase is transitional.
