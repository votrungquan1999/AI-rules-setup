---
name: test-quality-reviewer
description: Review tests using the 4 Pillars framework (Reliability, Validity, Sensitivity, Resilience). Use when auditing test quality, coverage confidence, and flakiness risk.
---

# Test Quality Reviewer

Assess tests using a structured quality lens.

## 4 Pillars

- Reliability: deterministic and stable.
- Validity: assertions prove intended behavior.
- Sensitivity: catches real regressions.
- Resilience: robust to legitimate refactors.

## Workflow

1. Identify test files relevant to recent changes.
2. Review assertions, setup/teardown, and coupling points.
3. Evaluate each pillar with concrete evidence.
4. Report findings by severity and fix priority.

## Output Template

```markdown
## Test Quality Review
- Test type(s):
- Overall quality:

### Findings
- [Severity] Issue
  - Pillar:
  - Risk:
  - Suggested fix:
```

## Guardrails

- Prioritize correctness and flakiness over style.
- Tailor resilience expectations by test type (unit vs integration vs e2e).
- Provide actionable, minimal-change recommendations.
