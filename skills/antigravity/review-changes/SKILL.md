---
name: review-changes
description: Senior engineer code review that inspects a diff through correctness, security, quality, performance, and test lenses in sequence, then reports confidence-scored, severity-ranked findings. Use when reviewing code, checking changes, or when the user says "review my changes", "code review", "review this diff", or "check my code".
---

# Review Changes

One agent reviews a diff end to end, in order: set up the right repo and base, run a holistic pass, walk the applicable review lenses one at a time, re-check the findings you couldn't confirm, then merge into one confidence-scored, severity-ranked report. You do every step yourself, inline — nothing is delegated or run in the background.

## When to Use This Skill

- Reviewing uncommitted work, a branch, or a pasted PR/MR link before merge.
- When the user asks for a code review, PR review, or pre-merge validation.

---

## Step 0 — Work in the right repo, against a fresh base

Do this before anything else.

**PR/MR link or number → review it in a dedicated worktree.** Never review a PR in the user's working tree — check the branch out in its own worktree so their current state is untouched. Detect the platform from the remote (`github.com` → `gh`, `gitlab` → `glab`), read the PR's head and base branches, then create the worktree the first time or refresh it if it already exists:

```bash
# Run from inside the target repo. Read the PR's head + base branch:
gh pr view <num> --json headRefName,baseRefName,headRefOid   # glab mr view <iid> --output json
REPO=$(basename "$(git rev-parse --show-toplevel)"); WT="../${REPO}-pr-<num>"

if [ -d "$WT" ]; then                        # exists → refresh target + base from remote
  git -C "$WT" fetch origin <head> <base>
  git -C "$WT" pull --rebase origin <head>   # rebase local onto latest remote head
else                                         # first time → create at the PR head
  git fetch origin <head> <base>
  git worktree add "$WT" "origin/<head>"
fi
```

- **Rebase conflict on refresh is rare — if `pull --rebase` reports a conflict, STOP and ask the user; do not resolve it yourself.**
- Set `BASE=origin/<base>`, run **every** step from inside `$WT`, and resolve `<ws>` (below) under `$WT`. The PR resolved both repo and base, so skip the two traps below.
- Leave the worktree in place after the review; surface its path in the report so the user can `git worktree remove "$WT"` later.

**Otherwise — a local branch or uncommitted work — infer repo and base:**

- **Repo.** Often not the current dir (you might be in `~/git-repos/personal` while the conversation is about `quant-trading/`). Infer it from the conversation (files named, IDE selection) and work from inside it. If the current dir isn't a git repo and the target is unclear, ask.
- **Base.** Use the base the user named (branch/tag/PR target); else `git fetch origin` and diff against the remote default branch (`origin/HEAD`, falling back to `origin/main`/`master`) — the local ref is usually stale. Fall back to `HEAD~1` only when there's no base branch at all (say so).

Scope: branch/PR → committed since `$BASE`; uncommitted → also `git status --short`; ambiguous → committed-since-base.

**Workspace.** Establish a task identifier (branch name, PR/MR number, or a short slug you confirm). Set `<ws>` = `./tmp/<identifier>/`; if it already holds artifacts from unrelated work, STOP and ask rather than overwriting. Write the final report to `<ws>/review-changes.md`.

---

## Step 1 — Holistic pass

Run `git diff "$BASE"` from inside the repo (fall back to `HEAD~1` only if no base branch exists). **Do NOT output the raw diff to the user.**

**Eligibility (gate).** Stop early when the review adds no value:
- **No changes** → say so and stop.
- **Trivial diff** (a handful of lines, generated files, pure formatting, version bumps) → do a single inline review and skip the lenses below. Note you took the fast path.

Only continue to the lenses when the diff is non-trivial (real logic, multiple files, or anything touching data/auth/security).

**Understand + summarize.** Read the PR/commit description and linked issues (or ask). Identify the **root cause** being solved, not just the symptom, and the constraints (compatibility, performance, existing patterns). Then write a high-level (not line-by-line) summary: what was added / modified / removed, the user-flow impact, the overall purpose, and the **business impact** — what this delivers in business/stakeholder terms, in plain language, no jargon.

**Approach evaluation.** Form your own mental model ("if I solved this from scratch, how would I?") and compare: does the change fix the root cause or just a symptom? Is it at the right layer? Are there simpler or more robust alternatives? Does it add unnecessary complexity? What trade-offs should the author know? If the approach differs from yours, is theirs still valid?

Keep this framing in mind — judge every lens finding against it.

---

## Step 2 — Review lenses (sequential, inline)

Which lenses apply — run only these, one at a time:
- **correctness** — always
- **quality** — always
- **security** — always
- **tests** — only if the diff adds or modifies test files
- **performance** — only if the change is perf-sensitive: it touches loops, DB/network/IO calls, data-structure/algorithm choice on non-trivial `n`, hot paths (request/render/event-loop), memory, or removes an existing optimization (index/memo/cache/batch/`LIMIT`/pagination). Skip for config/docs/type-only/test-only or one-time cold-path code.

For each lens, review the diff for the criteria below. **Shared discipline for every lens:** review ONLY the code in the diff (the security lens may read across files to trace data flow, but the finding must still concern diff'd code); assume intent is correct unless there's clear risk; and for every finding give a concrete **failure mode** (see Report). State which lenses you're running and why before starting.

**Correctness — review the diff for logic and behavioral defects:**
- Logic bugs: off-by-one, inverted conditions, wrong operators, incorrect control flow; state mutated wrongly, stale reads, bad ordering assumptions.
- Edge cases & error handling: null/undefined/empty inputs, empty collections, boundary values; failure paths handled vs. silently falling through; concurrency / races / async ordering where relevant.
- Performance is **out of scope here** — the performance lens owns it. Raise a perf issue in correctness only if it also produces a *wrong result* (e.g. a timeout silently dropping data), not mere slowness.

**Quality — review the diff for code quality and standards:**
- Naming (clear, descriptive), structure (logical flow), duplication (only flag at 3+ repetitions), comments (present for genuinely complex logic, accurate, not noise), typing (no unjustified `any`).
- Standards: follows project conventions (check the root project rules and any rules in the directories the diff touches — cite the specific rule when flagging), uses established patterns, justifies new dependencies, documents breaking changes.
- For substantial refactoring, recommend `@code-refactoring` rather than prescribing a big rewrite inline. Keep nits proportionate — don't bury real issues under style.

**Security — review the diff for security and data-safety defects.** You may follow data flow *across files* (IDOR, auth bypass, SSRF often only appear when you trace where diff'd values originate and end up), but the finding must concern code the diff introduced or newly exposed. State the data-flow path (source → sink) for each finding.
- Injection (SQL/NoSQL/command/template from unsanitized input); XSS (unescaped output, raw `innerHTML`); auth & access control (missing authz, IDOR, privilege escalation); input validation at trust boundaries; data exposure (secrets/PII in logs/responses/bundles, hardcoded credentials); SSRF / path traversal (user-controlled URLs or paths); unsafe deserialization (`pickle`, `yaml.load`, `torch.load(weights_only=False)`, etc. on untrusted data).

**Tests (only if the diff adds/modifies test files) — review the diff for test quality:**
- Coverage of the change (do tests exercise what was added/modified?), edge cases (not just happy path), sensitivity (would the test actually fail if the code broke? flag over-mocked tests or ones asserting on mocks), validity (assertions check real behavior), resilience (tests go through public interfaces, not brittle internals).
- For a deep pass, defer to `@test-quality-reviewer` (4 Pillars) rather than duplicating its analysis.

**Performance (only if perf-sensitive) — review the diff for performance regressions it introduces.** Like security, you may read across files, but only to establish **magnitude**: is the path hot (per-request/render/item vs one-time/cold) and is `n` unbounded? Anchor to the change — cost before vs after. A finding without magnitude is a NIT; drop it. You can't benchmark a diff, so when magnitude depends on runtime data you can't see, state the finding conditionally or mark it unverified — never invent numbers.
- Algorithmic complexity (nested loops / repeated scans over unbounded `n`, accidental quadratics like `includes` in a loop); data access & I/O (N+1, per-item DB/network calls in a loop, missing batching/pagination, blocking the event loop); memory & allocation (unbounded growth, large copies, leaks); redundant work (recompute that could be hoisted/memoized); frontend rendering (needless re-renders, un-virtualized lists, bundle-size regressions); regression by removal (the diff deletes an index/memo/cache/batch/`LIMIT`/pagination).
- **Severity**: MUST FIX for unbounded growth/OOM, timeout/DoS on realistic input, N+1 on a hot path at real scale, blocking the event loop; SHOULD FIX for bounded degradation; NIT for micro-opts with no magnitude. **Don't flag**: premature optimization on cold paths, bounded-small `n`, patterns the runtime/DB planner already optimizes, or readability-costing micro-opts. If attacker-triggerable (ReDoS, complexity DoS), note the security/DoS angle too.

---

## Step 3 — Verify what you couldn't confirm

Most findings you can confirm from what you read while reviewing — trust those. For any finding that **rests on something you could not confirm from the diff alone** (behavior of a function outside the diff, what a caller actually passes, a runtime/ordering assumption, whether a guard exists elsewhere), re-check it now: open the surrounding code, callers, and types, and walk the failure mode (trigger → behavior → harm) against the real code.
- If the chain holds → keep it as **confirmed**.
- If a guard, caller-side check, framework behavior, or unreachable trigger breaks the chain, or the line is pre-existing / CI-caught → drop it.
- If it's plausible but you still can't confirm → keep as a candidate marked **unverified** and score it conservatively in Step 4.
- For a **performance** finding, confirming means the magnitude holds — `n` really unbounded, path really hot. If you can't confirm magnitude from the code, keep it **unverified**, not confirmed.

---

## Step 4 — Merge

**Confidence score.** Score each surviving finding 0–100 for how likely it is a real, in-scope issue:
- **0–25** — false positive under light scrutiny, or a pre-existing issue on untouched lines
- **26–50** — might be real but unverified, or a stylistic nit not in project conventions
- **51–75** — verified real, but low-impact / infrequent / minor relative to the change
- **76–90** — important; double-checked and likely to bite in practice
- **91–100** — certain; directly confirmed, will happen frequently

**Filter.** Drop everything scoring **< 80**. If nothing remains, say the changes look good. Attach the score to each surfaced finding.

**Dedupe.** When two lenses flag the same file + line + root issue, keep one entry at the **highest** severity and note both lenses.

**Normalize severity** to MUST FIX / SHOULD FIX / NIT:
- **MUST FIX** — could cause bugs, security vulnerabilities, or data loss
- **SHOULD FIX** — important for maintainability, performance, or best practices
- **NIT** — minor style/consistency (only mention if worth noting)

---

## Report

Write the complete review to `<ws>/review-changes.md`:

```markdown
## Summary

[What changed and overall risk level, plus the business impact in plain language.]

## Findings

### [Issue Title]
- **Severity**: MUST FIX / SHOULD FIX / NIT
- **Confidence**: [80–100]
- **Verified**: confirmed (re-checked against real code) / trusted (confirmed while reviewing, no check needed) / unverified (still uncertain after a check)
- **Lens**: correctness / security / quality / tests / performance
- **Description**: [What's wrong]
- **Failure mode**: [Concrete trigger → behavior → harm, OR "No distinct failure mode — <maintainability/readability> concern". Never a vague restatement like "could cause bugs".]
- **Why it matters**: [Impact/risk — the magnitude, given the failure mode above]
- **Suggested fix**: [Concrete, actionable; code snippet only if helpful]

## Positive Notes

[Good practices worth calling out]

## Recommendation

✅ Safe to merge / ⚠️ Merge with comments / ❌ Needs changes before merge
```

---

## What NOT to flag

- Pre-existing issues, or anything on lines the diff did not modify.
- Anything a linter / typechecker / compiler would catch (imports, types, formatting) — assume CI runs these.
- Pedantic nitpicks a senior engineer wouldn't raise.
- Changes that are clearly intentional and part of the broader change.

Do NOT run the build or typecheck — that is CI's job. Never comment on code outside the diff.

## Related Skills

- `@test-quality-reviewer` — detailed test quality analysis using the 4 Pillars framework (the tests lens may defer to it).
- `@code-refactoring` — structured refactoring suggestions.
- `@commit-plan` — organize reviewed changes into semantic commits.
