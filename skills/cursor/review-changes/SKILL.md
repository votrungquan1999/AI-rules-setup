---
name: review-changes
description: Senior-level diff review via parallel review-lens subagents with a verification pass and confidence-scored merge. Use when the user asks for a code review, PR review, or pre-merge validation.
---

# Review Changes

Orchestrate a code review as a lightweight **fan-out -> verify -> merge** pipeline: run a holistic pass inline, fan out review lenses as parallel subagents, verify only the findings a lens flagged, then merge into one severity-ranked report. No per-phase user gates — spawn, collect, verify, merge, done.

## Pipeline

```text
[holistic: eligibility + summary + approach-eval]   (inline, strong model)
   -> [gate: which lenses apply?]
   -> [correctness] [quality] [security] [tests]     (parallel subagents)
   -> [gate: which findings flagged "Needs verification"?]
   -> [verify flagged findings]                       (parallel subagents)
   -> [merge: apply verdicts -> confidence-score -> filter -> dedupe -> severity]   (inline)
   -> ./tmp/review-changes.md
```

## Workspace

Intermediates live in `./tmp/review-changes/`; the final report is `./tmp/review-changes.md` (one level up, a stable path for the caller).

- `HOLISTIC.md` — summary + approach evaluation (you, Phase 1; shared with every lens)
- `LENS_<name>.md` — per-lens findings
- `VERDICT_<batch>.md` — per-batch verification verdicts

## Orchestrator Responsibilities

- Run the holistic phase **inline on the strong model** — it needs the whole picture and produces the framing every lens depends on.
- Spawn lens subagents **in parallel**; pass each its node file + `HOLISTIC.md`. Use a smaller model for correctness/quality/tests; keep **security on the strong model** (cheap security review gives false confidence, and it must trace data flow across files).
- Spawn verifier subagents **only** for findings flagged `Needs verification: yes`; trust the rest. Keep a verifier batch on the strong model if it contains a security finding.
- Merge **inline**: apply verdicts, score, filter, dedupe, write the report yourself.
- Never output the raw diff, and never comment on code outside the diff.

## Phase Entry Points

- `nodes/node-holistic.md` — run inline (Phase 1)
- `nodes/lens-common.md` — shared lens rules (every lens reads this)
- `nodes/node-lens-correctness.md`, `node-lens-quality.md`, `node-lens-security.md`, `node-lens-tests.md`
- `nodes/node-verify.md` — verify flagged findings

## Step 0 — Resolve the target repo and diff base (do this first, yourself)

Nothing runs on load — you run the git commands, in the right repo, before Phase 1. Two traps:

- **Wrong directory.** The launch dir is often a *parent* of the repo under review (e.g. you're in `~/git-repos/personal` but the conversation is about `quant-trading/`). Never assume the pwd is the repo.
- **Stale base.** The local `main`/`master` ref is usually behind the remote, so diffing against it shows already-merged commits as "changes."

1. **Pick the target repo `$REPO`.** Infer it from the conversation — repo named in the request, files under discussion, IDE selection — not just the pwd. Verify: `git -C "$REPO" rev-parse --show-toplevel`. If the pwd isn't a git repo and no target is clear, ask which repo to review.
2. **Run every git command with `git -C "$REPO" …`** — never rely on the working directory.
3. **Fetch, then take a fresh base.** Auto-fetch so the base isn't stale, prefer remote-tracking refs over local:
   ```bash
   git -C "$REPO" fetch --quiet origin
   BASE=$(git -C "$REPO" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null \
     || for b in origin/main origin/master origin/develop; do \
          git -C "$REPO" rev-parse --verify --quiet "$b" >/dev/null && echo "$b" && break; done)
   MERGE_BASE=$(git -C "$REPO" merge-base HEAD "$BASE")
   ```
   Fall back to `HEAD~1` only when there is no base branch at all (say so).
4. **Scope the diff to what the user asked for.** Reviewing a branch/PR → committed changes since the base (`git -C "$REPO" diff "$MERGE_BASE"`); reviewing current/uncommitted work → also include `git -C "$REPO" status --short`; ambiguous → default to committed-since-base and note what you covered.

Pass `$REPO` and `$BASE` to every lens and verifier subagent so they run against the same repo and base.

## Phases

1. **Holistic (inline).** Run `node-holistic.md` against `$REPO`/`$BASE` from Step 0: eligibility (empty/trivial diff -> say so and stop, or do a single inline pass and skip the fan-out), changes summary, approach evaluation. Write `HOLISTIC.md`. **Gate:** if eligibility stops the review, stop.
2. **Lens gate.** Always run correctness, quality, security; run tests only if the diff adds/modifies test files. State which lenses and why before spawning.
3. **Lenses (parallel subagents).** Each reads its node file + `lens-common.md` + `HOLISTIC.md`, sees the changes via `git -C "$REPO" diff "$BASE"`, reviews ONLY the diff, writes `LENS_<name>.md`, and reports finding count + highest severity.
4. **Verification (parallel subagents).** Lenses are **trusted by default**. Verify only findings marked `Needs verification: yes` — the lens flagged something it couldn't confirm from the diff alone (behavior outside the diff, a caller's actual input, a runtime assumption, a guard that may exist elsewhere). Batch 2-4 flagged findings by shared file; each verifier resolves the flagged uncertainty against the real code and writes `VERDICT_<batch>.md`. Skip the phase entirely if nothing is flagged.
5. **Merge (inline).** Apply verdicts — REFUTED -> drop; CONFIRMED -> keep with the verifier's adjusted severity; UNCERTAIN -> score conservatively (usually falls below the filter); trusted (never-flagged) findings -> carry through as-is. Then score each survivor 0-100 for "real, in-scope issue", **drop everything < 80**, dedupe by file+line (keep highest severity), normalize severity. Write `./tmp/review-changes.md`. If nothing survives, say the changes look good.

## Report Format

Each finding lists: **Severity**, **Confidence** (80-100), **Verified** (confirmed / trusted / unverified), **Lens**, **Description**, **Failure mode** (concrete trigger -> behavior -> harm, or `No distinct failure mode — <maintainability/readability> concern` — never a vague restatement), **Why it matters**, **Suggested fix**. End the report with **Positive Notes** and a **Recommendation**: safe to merge / merge with comments / needs changes.

## Severity

- **MUST FIX** — could cause bugs, security vulnerabilities, or data loss
- **SHOULD FIX** — important for maintainability, performance, or best practices
- **NIT** — minor style/consistency

## What NOT to flag

Pre-existing issues or lines the diff didn't touch; anything a linter/typechecker/compiler catches; pedantic nits; clearly intentional changes. Do not run the build or typecheck — that is CI's job.

## Related Skills

- `@test-quality-reviewer` — detailed test quality analysis (the tests lens may defer to it)
- `@code-refactoring` — structured refactoring suggestions
- `@commit-plan` — organize reviewed changes into semantic commits
