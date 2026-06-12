---
name: find-patterns
description: Extracts architectural, testing, or database patterns from the codebase using structured search and extraction methodology. Use when you need to understand "how things are done here" (e.g., test patterns, DB access patterns).
---

# Find Patterns

A structured approach to extract established coding patterns (like testing strategies, database interactions, component structures) from the existing codebase, so you can adhere to them during feature development.

## Purpose

To avoid introducing new conventions when established patterns already exist for common problems (e.g., error handling, database transactions, API responses, testing).

## Instructions

### Step 1: Define the Scope 

Determine what type of pattern you are looking for:
- **Testing Pattern:** (e.g., "How do we mock dependencies?", "What is the assertion style?")
- **Architecture Pattern:** (e.g., "How are controllers connecting to services?")
- **Database/Data Access:** (e.g., "How do we handle transactions, connection pooling, or ORM usage?")

### Step 2: Incremental Exploration (Search Strategy)

Do not attempt to read the entire repository at once constraint limits will cause failure. Use your tools incrementally:

1. **Repo Map:** Identify the core module or folder (e.g., `src/data/`, `tests/e2e/`).
2. **Find Exemplars:** Use `grep_search` to find highly relevant files. Look for files with names that imply they handle the concern (e.g., `user.repository.ts`, `auth.service.spec.ts`).
3. **Read Specifics:** Use `view_file` to read 2-3 specific, representative files deeply.

### Step 3: Pattern Extraction

Analyze the files using the **CTCO (Context, Task, Constraints, Output)** framework.

- **Context:** Recognize the domain and framework (e.g., Express.js, Pytest, Next.js App Router).
- **Task:** Identify the *exact* mechanism used to solve the problem (e.g., "Observe how error handling and transaction management is wrapped").
- **Constraints:** Focus ONLY on the pattern, ignoring domain-specific business logic.
- **Output Structure:** Document the pattern in your internal thought processes or output.

Look for:
- **Imports:** What shared utilities, libraries, or base classes are used?
- **Setup/Teardown:** (For tests) How is the environment prepared?
- **Error Handling:** How are exceptions caught, logged, and thrown?
- **Naming Conventions:** How are variables, functions, and files typically named?

### Step 4: Validate the Pattern

Act as a critic to ensure you haven't captured an anti-pattern or a deprecated approach. 
Are there consistent repetitions of this pattern across the 2-3 files you checked? If a pattern exists in only one file, it may be an anomaly or an abandoned refactor. Ensure it is established.

### Step 5: Document the Pattern (Artifact)

Create an output artifact (e.g., `pattern-<type>.md` in the brain directory) to document the finding for the user and for your future reference in this conversation. 

Use this format:

```markdown
# Pattern: [Name of Pattern]

## Context
When to use this pattern (e.g., "When creating a new repository for database access").

## Core Elements
- **Libraries/Utilities used:** (e.g., `import { db } from '@/server/db'`)
- **Structure:** (e.g., exported class, functional hook, describe block)
- **Error Handling:** (e.g., Wraps in `try/catch` and returns a standard `ApiResponse`)

## Example Structure
[Provide a sanitized code snippet abstracting away business logic, but preserving the skeleton of the pattern]

## Rules to Follow
1. Always do X.
2. Never do Y.
```

### Step 6: Presentation

Present the artifact to the user and confirm if this pattern satisfies their initial question, or if they want to enforce this pattern moving forward.

## Best Practices

- ✅ Find at least 2 files using the pattern to confirm it's a standard, not an anomaly.
- ✅ Abstract away business logic to highlight the pure structural pattern.
- ❌ Do not guess the pattern based on standard industry practices—read the actual repository.
- ❌ Do not write a 5-page document. Keep it concise, skeleton-focused, and actionable.

