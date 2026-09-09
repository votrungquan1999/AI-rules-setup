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
4. **Survey the project's test patterns** — the BDD loop defaults to the integration level, so report what it has to work with: the test command, test dirs/naming, harness and setup files (vitest/jest config, `conftest.py`, playwright, testcontainers, supertest, a test DB), fixtures/factories/state reset, and **one existing integration test read end to end** as the file the BDD subagents will mirror. Commit to a verdict — the harness, its exact command, and that example file, or `none found`. `none found` is a real answer to report plainly; the orchestrator turns it into a user question at the Phase 1 gate. Do not propose a harness to build, and do not count mock-heavy unit tests as an integration harness.
5. Identify code-answerable follow-up investigations.

## Output

Write `<ws>/RESEARCH_OUTPUT.md`:

```markdown
## Files Read
## Key Patterns
## Testing Patterns
<!-- Integration harness: [name] | none found · Command: [project's own script] · Example to mirror: [path] · Fixtures/factories/state reset: [how] -->
## Affected Areas
## Follow-up Investigations Needed
## Open Questions For User
```

If open product/requirement questions remain, pause and ask user before planning.
