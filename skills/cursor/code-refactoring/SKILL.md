---
name: code-refactoring
description: Refactor code safely with incremental transformations and test-backed verification. Use for cleanup, simplification, extraction, and duplication removal without behavior changes.
---

# Code Refactoring

Improve structure while preserving behavior.

## When to Use

- Reduce complexity and nesting.
- Extract reusable functions/components.
- Remove duplication.
- Improve naming and module boundaries.

## Workflow

1. Identify refactoring target and objective.
2. Confirm tests exist for affected behavior.
3. Run baseline tests.
4. Apply one refactoring change at a time.
5. Re-run tests after every change.
6. Repeat until target is clean and stable.

## Common Patterns

- Extract function
- Rename symbols for clarity
- Simplify conditionals with guard clauses
- Move logic to better module boundaries
- Remove duplicated logic

## Guardrails

- Do not refactor without test coverage unless user accepts risk.
- Do not combine feature work and refactoring in the same step.
- Keep refactoring changes atomic and reversible.
