---
name: validate-pr-comments
description: Triage PR review comments against current branch code and classify each as VALID, OUTDATED, INVALID, or PARTIAL. Use when user asks to evaluate whether review feedback still applies.
---

# Validate PR Comments

Evaluate reviewer comments against the latest code state, not against assumptions.

## When to Use

- PR has many comments and needs triage.
- Branch changed after comments were posted.
- Author disagrees with feedback and wants evidence-based evaluation.

## Workflow

1. Gather required inputs:
   - PR URL or number
   - Target repository (if not current repo)
2. Fetch comments and metadata using platform CLI/API.
3. Check out the relevant branch/worktree for isolated inspection.
4. For each comment:
   - locate referenced file/line/context
   - compare comment claim against current code
   - classify: `VALID`, `OUTDATED`, `INVALID`, `PARTIAL`
   - assign confidence and evidence
5. Produce a prioritized action list:
   - fix valid items
   - resolve outdated ones with notes
   - draft respectful responses for invalid/partial cases

## Classification Rules

- `VALID`: claim is correct and still applies.
- `OUTDATED`: previously valid but already addressed.
- `INVALID`: technically incorrect for current code.
- `PARTIAL`: comment has a correct sub-point but overreaches elsewhere.

## Output Template

```markdown
## Summary
- Total comments:
- VALID / OUTDATED / INVALID / PARTIAL:

## Findings
### [VALID] <title>
- Evidence:
- Recommendation:

### [OUTDATED] <title>
- Evidence:
- Suggested reviewer reply:
```

## Guardrails

- Base judgments on current branch state and concrete evidence.
- Do not auto-reply, auto-resolve, or push fixes unless user asks.
