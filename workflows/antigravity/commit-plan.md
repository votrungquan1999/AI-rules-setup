---
description: Create a semantic commit plan by analyzing git changes and grouping them logically
---

# Commit Plan Workflow

This workflow helps create a well-structured commit plan by analyzing your current git changes and grouping them into semantic commits.

## Usage

Use this workflow when you have uncommitted changes and want to create a clean commit history with semantic commit messages.

## Steps

1. **Analyze Changes**: Run `git diff` and `git status` to see all modified files
2. **Group Changes**: Group related changes into logical commits based on:
   - Feature additions (feat:)
   - Bug fixes (fix:)
   - Documentation (docs:)
   - Code refactoring (refactor:)
   - Tests (test:)
   - Build/CI changes (chore:)
   - Performance improvements (perf:)
3. **Create Commit Plan**: For each group, create a commit with:
   - Semantic prefix (feat/fix/docs/etc)
   - Scope in parentheses (optional)
   - Clear, concise description
   - List of files to include
4. **Present Plan**: Show the commit plan to the user for review
5. **Execute**: After approval, execute the commits using `git add` and `git commit`

## Example Output

```markdown
## Commit Plan

### Commit 1: feat(auth): Add user authentication

Files:

- src/auth/login.ts
- src/auth/types.ts

### Commit 2: test(auth): Add authentication tests

Files:

- tests/auth/login.test.ts

### Commit 3: docs(readme): Update authentication documentation

Files:

- README.md
```

## Notes

- Never commit artifacts or generated files
- Keep each commit focused on one logical change
- Use conventional commit format
- Always present plan before executing
