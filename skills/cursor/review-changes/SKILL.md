---
name: review-changes
description: Perform a senior-level diff review focused on correctness, risk, security, edge cases, and test gaps. Use when user asks for code review, PR review, or pre-merge validation.
---

# Review Changes

Review code changes with a risk-first approach in a single sequential pass. Focus on real defects and regressions, not style nitpicks.

## When to Use

- User asks to review a PR or local changes.
- Before merge or before creating commits.
- During quality gates in feature development.

## Workflow

1. **Determine scope** — current branch vs base branch (usually `main`), or the staged/unstaged local diff. Do not output the raw diff.
2. **Eligibility check** — if there are no changes, say so and stop. If the diff is trivial (a few lines, pure formatting, generated files, version bumps), do a quick pass and skip the deep review.
3. **Gather context (holistic framing)** — what problem is being solved (root cause, not symptom)? What constraints (backward compatibility, performance, security)? Form your own mental model of a correct fix.
4. **Approach evaluation** — does the change fix the root cause or a symptom? Is it the right layer? Are there simpler/more robust alternatives? Any over-engineering or trade-offs to flag?
5. **Analyze the diff through these lenses, in priority order:**
   - **Correctness** — logic bugs, edge cases, error handling, perf regressions introduced by the change
   - **Security** — injection, XSS, auth/access control (IDOR), input validation, data exposure, SSRF/path traversal, unsafe deserialization. Trace data flow across files if needed.
   - **Quality** — naming, structure, duplication (3+ repetitions), `CLAUDE.md` / convention compliance, justified dependencies
   - **Tests** (only if tests changed) — do they cover the change, hit edge cases, and actually fail when the code breaks?
6. **Score and filter** — rate each finding 0–100 for confidence it is a real, in-scope issue (0–25 false positive/pre-existing, 51–75 real but low-impact, 76–100 important and verified). **Drop anything below 80.** Attach the score to each surfaced finding.
7. If no findings survive, state the changes look good and call out residual risk or test gaps.

## What NOT to flag

- Pre-existing issues, or issues on lines the diff didn't modify
- Anything a linter/typechecker/compiler catches (imports, types, formatting) — assume CI runs these
- Pedantic nitpicks a senior engineer wouldn't raise
- Clearly intentional changes that are part of the broader work

Do not run the build or typecheck — that is CI's job.

## Report Format

```markdown
## Change Summary
- <brief functional summary + overall risk level>

## Findings

### <Issue title>
- Severity: MUST FIX | SHOULD FIX | NIT
- Confidence: <80–100>
- Lens: correctness | security | quality | tests
- Risk: <bug/regression/security impact>
- Evidence: <file/symbol and concise reasoning>
- Suggested fix: <actionable fix>

## Open Questions / Assumptions
- <only if needed>

## Recommendation
✅ Safe to merge | ⚠️ Merge with comments | ❌ Needs changes before merge
```

## Severity Definitions

- **MUST FIX** — could cause bugs, security vulnerabilities, or data loss
- **SHOULD FIX** — important for maintainability, performance, or best practices
- **NIT** — minor style/consistency

## Guardrails

- Review only changed code unless surrounding context is required (the security lens may read across files to trace data flow).
- Prefer concrete findings over broad refactor requests; for large refactors, recommend a dedicated refactoring pass.
- Do not output raw patch dumps; summarize and cite the important parts.
