# Node: Research

Gather codebase context and remove ambiguity before planning.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## Input

- User feature request
- Existing repository structure and related modules/tests

## Workflow

1. Surface requirement gaps first:
   - unclear scope
   - hidden assumptions
   - edge/error behaviors
2. Read broadly, then deeply:
   - affected entry points
   - related tests
   - types/interfaces/models
   - shared helpers
3. Capture existing patterns and likely affected areas.
4. Identify code-answerable follow-up investigations.

## Output

Write `<ws>/RESEARCH_OUTPUT.md`:

```markdown
## Files Read
## Key Patterns
## Affected Areas
## Follow-up Investigations Needed
## Open Questions For User
```

If open product/requirement questions remain, pause and ask user before planning.
