---
name: root-cause-analysis
description: Diagnose defects with hypothesis-driven debugging and proof-of-cause output. Use when user asks to debug, investigate failures, or explain why behavior is broken.
---

# Root Cause Analysis

Find and prove the cause of a bug before proposing fixes.

## When to Use

- Failing tests with unclear cause.
- Production bug investigations.
- Intermittent or hard-to-reproduce issues.

## Core Rule

Do investigation first. Do not jump to implementation until cause is proven.

## Workflow

1. Reproduce and capture facts:
   - exact steps, inputs, and environment
   - logs/errors/stack traces
2. Form at least 3 falsifiable hypotheses.
3. Prioritize easiest-to-disprove hypotheses first.
4. Isolate execution path using divide-and-conquer checks.
5. Eliminate wrong hypotheses with evidence.
6. Produce proof of root cause:
   - expected vs actual state
   - precise failing assumption or logic point
   - impact scope
7. Recommend next implementation skill or fix plan.

## Output Template

```markdown
## Root Cause
- Location:
- Failing condition:
- Why it fails:

## Evidence
- Reproduction:
- Observed logs/state:
- Eliminated hypotheses:

## Recommended Next Step
- <targeted fix strategy>
```

## Guardrails

- Avoid guess-driven fixes.
- Remove temporary debug artifacts before finishing.
- If reproduction is not possible, clearly state confidence level.
