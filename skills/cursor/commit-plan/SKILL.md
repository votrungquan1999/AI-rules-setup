---
name: commit-plan
description: Analyze git changes and propose a semantic commit plan with grouped files, rationale, and commit messages. Use when user asks to organize commits, split changes, or prepare a clean commit history.
---

# Commit Plan

Create a clean, reviewable commit plan from the current git state before any commit is created.

## When to Use

- User asks for a commit plan or commit grouping.
- Working tree has mixed concerns.
- Team wants atomic commits with clear history.

## Workflow

1. Inspect current state:
   - `git status --short`
   - `git diff --stat`
   - `git log --oneline -10`
2. Read key changed files to understand intent, not just filenames.
3. Group changes into logical commits:
   - `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`
4. Ensure **one file belongs to exactly one commit** in the plan.
5. For each planned commit, provide:
   - Title (conventional commit style)
   - Why this unit exists
   - Files included
6. Present plan and wait for user approval before committing.

## Output Template

```markdown
## Commit Plan

### Commit 1: <type(scope): summary>
- Why: <reason for this atomic unit>
- Files:
  - path/to/file-a
  - path/to/file-b

### Commit 2: <type(scope): summary>
- Why: <reason>
- Files:
  - path/to/file-c
```

## Guardrails

- Do not create commits unless user explicitly asks.
- Do not include generated artifacts, secrets, or unrelated files.
- Keep commit titles concise and meaningful.
