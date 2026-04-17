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

4. **Research the standard approach:**
   - Use `@web-search` to find the standard/best/recommended way to implement this type of feature
   - Look for established patterns, common pitfalls, and industry best practices
   - Compare what you find externally with the patterns already in the codebase

5. When researching external libraries or APIs, use `@context7` for documentation queries and `@web-search` for broader research.

6. **Count what you read** — track the number of files examined.

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
- [How tests are organized in this part of the codebase]
- [Testing utilities available]

## Unknowns / Questions
- [Requirements that were unclear from the feature request]
- [Assumptions made during research — flag these for user confirmation]
- [Anything discovered during reading that needs user input]
```
