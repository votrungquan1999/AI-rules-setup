# Node: Research

Focused context-gathering phase. Read the codebase to understand patterns, architecture, and affected areas.

## Input

Read the user's feature request from the conversation context.

## Execution

1. **Surface requirements gaps first.**
   Before reading files, review the feature request from conversation context and identify:
   - Anything that is unclear or underspecified
   - Any assumption you would be tempted to make
   - Any edge cases or error states not described

   If critical requirements are unclear, **stop and ask before reading files**. Document open questions in the output.

2. **Identify the feature area** — what part of the codebase is affected?

3. **Read broadly first:**
   - Entry points and main files for the affected area
   - Related tests to understand existing behavior
   - Types, interfaces, and data models
   - Configuration files if relevant

4. **Read deeply second:**
   - Implementation details in the core affected files
   - Patterns used in similar features (if any exist)
   - Utility functions and shared helpers that might be reused

5. **Survey the project's test patterns — required, and deeper than a glance at the config.** The BDD loop defaults to the integration level (drive the real flow through the client-facing entry point with real collaborators), so it needs to know what this project already gives it. Find:
   - The **test command** — `package.json` scripts (or `Makefile`, `pyproject.toml`, `justfile`); note whether integration/e2e has a script of its own
   - **Test locations and naming** — `tests/`, `__tests__/`, `*.test.ts` vs `*.integration.test.ts` vs `tests/e2e/`
   - **Harness and setup files** — `vitest.config`, `jest.setup`, `conftest.py`, `playwright.config`, testcontainers, `supertest`, `msw`, an in-memory or throwaway test DB
   - **Fixtures, factories, and seeds** — how a test gets a user, a record, an authenticated client; how state is reset between tests
   - **One real example** — read an existing integration/e2e test end to end. Name it: it is the file the BDD sub-agents will mirror, and it carries conventions no config file states.

   Then commit to a verdict in the output: the harness that exists, the exact command that runs it, and the example file to mirror — or `none found`. `none found` is a real answer and must be reported plainly; the orchestrator turns it into a question for the user at the research gate. Do NOT propose a harness to build, and do not treat a pile of mock-heavy unit tests as an integration harness.

6. **Research the standard approach:**
   - Use `@web-search` to find the standard/best/recommended way to implement this type of feature
   - Look for established patterns, common pitfalls, and industry best practices
   - Compare what you find externally with the patterns already in the codebase

7. When researching external libraries or APIs, use `@context7` for documentation queries and `@web-search` for broader research.

8. **Count what you read** — track the number of files examined.

9. **Resolve code-answerable questions yourself — do not defer them.**
   If something can be answered by reading the code (how a function behaves, where a type is defined, whether a pattern already exists, how an existing flow works), keep reading until you have the answer. Do NOT write "this needs further investigation" or "the code should be checked to understand X" for anything you could resolve by reading more files.

   A thread belongs in **Follow-up Investigations Needed** ONLY when it is code-answerable but you genuinely could not finish chasing it in this pass — e.g. the scope is too large, it branches into a separate subsystem, or you discovered it late. Each item must be a concrete, self-contained investigation target (a specific question + where to look), NOT a vague "look into this more."

   A thread belongs in **Open Questions for the User** ONLY when it is a product/requirement decision the code cannot answer (desired behavior, scope boundary, business rule).

   If you were re-run with a **specific follow-up item** to chase, investigate only that item, append your findings to the artifact, and resolve it — only re-list it if it branches into further code-answerable threads.

## Output

Write findings to the `research-output.md` artifact in the brain directory:

```markdown
# Research Output

## Files Read: [count]

## Feature Area
[Brief description of what area of the codebase is affected]

## Key Patterns Found
- [Pattern 1]: [Where it's used and how]
- [Pattern 2]: [Where it's used and how]

## Existing Related Code
- [File/function]: [What it does and how it relates]

## Affected Areas
- [Area 1]: [How it's affected]
- [Area 2]: [How it's affected]

## Testing Patterns
- **Integration harness:** [name + what it covers] | none found
- **Command to run it:** [the project's own script, e.g. `npm run test:integration`]
- **Example to mirror:** [path to one existing integration/e2e test]
- **Fixtures / factories / state reset:** [how a test gets its preconditions and cleans up]
- [How tests are organized in this part of the codebase]
- [Other testing utilities available]

## Follow-up Investigations Needed
<!-- Code-answerable threads you could not finish this pass. The orchestrator will re-run research on each. Leave empty if research is complete. -->
- [Concrete question]: [Exact files/dirs/symbols to start from]

## Open Questions for the User
<!-- Product/requirement decisions only — NOT things the code can answer. -->
- [Decision the user must make]
```

**CRITICAL:** After writing the output, report to the orchestrator whether "Follow-up Investigations Needed" is empty. Do NOT pause for the user while that section is non-empty — the orchestrator (see the skill's Phase 1) re-runs research to resolve those threads first. Only once it is empty does the orchestrator pause to ask the user if research is sufficient. Answer any questions the user has during that pause.
