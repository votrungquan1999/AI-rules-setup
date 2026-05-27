---
name: create-pr
description: Draft high-quality PR title and description by analyzing branch changes versus base branch. Use when preparing pull requests for review.
---

# Create PR

Generate a reviewer-friendly PR draft that explains what changed and why.

## Workflow

1. Determine base branch and collect branch diff.
2. Review commit history and key changed files.
3. Create concise PR title:
   - imperative tone
   - outcome-focused
4. Draft PR description with:
   - What changed
   - Why it changed
   - Testing/verification
   - Risks or follow-ups
5. Present draft for user review before creating PR.

## Title Format

- If ticket exists: `[TICKET-123] Short outcome`
- Otherwise: `type(scope): short outcome`

## Guardrails

- Do not dump raw diffs into PR text.
- Do not include local/internal file URI artifacts.
- Keep description high-signal and easy to review quickly.
