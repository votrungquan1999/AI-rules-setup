# Node: Research

Gather codebase context and remove ambiguity before planning.

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

Write `tmp/orchestrated-feature-dev/RESEARCH_OUTPUT.md`:

```markdown
## Files Read
## Key Patterns
## Affected Areas
## Follow-up Investigations Needed
## Open Questions For User
```

If open product/requirement questions remain, pause and ask user before planning.
