---
name: test-quality-reviewer
description: Review tests — first whether each earns its place (a test that cannot fail is reported for deletion), then the 4 Pillars framework (Reliability, Validity, Sensitivity, Resilience). Use when auditing test quality, hunting tests that guarantee nothing, and flakiness risk.
---

# Test Quality Reviewer

Assess tests using a structured quality lens.

## Necessity gate (runs before the pillars)

For each test: **what defect would this catch that no other test catches?** If the answer is "none", the finding is **delete it** — not improve it. A test that guarantees nothing costs maintenance on every refactor and reports coverage it never earned.

The signature that fails this gate most often is **entailment**: the asserted value is already fixed by the test's own arrange block — stub returns `X`, call through, assert `X`. Ask it concretely: if the code under test were replaced with a pass-through, would this go red? If no, it tests the mock. A test that fails this gate is reported for deletion, not scored below.

## 4 Pillars

- Reliability: deterministic and stable.
- Validity: assertions prove intended behavior.
- Sensitivity: fails when the behavior is wrong — judged **only on the observable outcome** (returned value, persisted state, response body, rendered output). An assertion that a collaborator *was called*, with or without its arguments, is not sensitivity: it re-states wiring the test itself set up. In an integration test it is disqualifying — mock the collaborators the seams run through and the test has no subject left.
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

### Tests to Delete
- [Test, line] — what it fails to catch. ("none" if every test earns its place.)

### Findings
- [Severity] Issue
  - Pillar:
  - Risk:
  - Suggested fix:
```

## Guardrails

- Prioritize correctness and flakiness over style.
- Tailor resilience expectations by test type (unit vs integration vs e2e). "It's a unit test" is never a reason to assert on a collaborator's call log instead of a result.
- Provide actionable, minimal-change recommendations.
