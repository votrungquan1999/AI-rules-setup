---
name: review-changes
description: Perform a senior-level diff review focused on correctness, risk, security, edge cases, and test gaps. Use when user asks for code review, PR review, or pre-merge validation.
---

# Review Changes

Review code changes with a risk-first approach. Focus on real defects and regressions, not style nitpicks.

## When to Use

- User asks to review a PR or local changes.
- Before merge or before creating commits.
- During quality gates in feature development.

## Workflow

1. Determine review scope:
   - Current branch vs base branch (usually `main`)
   - Or staged/unstaged local diff
2. Gather context:
   - What problem is being solved?
   - Any constraints (backward compatibility, performance, security)?
3. Analyze diff in this order:
   - Correctness and logic bugs
   - Security and data safety
   - Edge cases and error handling
   - Performance regressions introduced by this change
   - Test coverage quality and missing scenarios
4. Provide findings with severity.
5. If no issues, state that clearly and call out residual risk or test gaps.

## Report Format

```markdown
## Findings

### <Issue title>
- Severity: MUST FIX | SHOULD FIX | NIT
- Risk: <bug/regression/security impact>
- Evidence: <file/symbol and concise reasoning>
- Suggested fix: <actionable fix>

## Open Questions / Assumptions
- <only if needed>

## Change Summary
- <brief functional summary>
```

## Guardrails

- Review only changed code unless surrounding context is required.
- Prefer concrete findings over broad refactor requests.
- Do not output raw patch dumps; summarize and cite the important parts.
