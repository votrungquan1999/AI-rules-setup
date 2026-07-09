---
name: review-changes
description: Senior-level diff review via parallel review-lens subagents with a verification pass and confidence-scored merge. Use when the user asks for a code review, PR review, or pre-merge validation.
---

# Review Changes

Orchestrate a code review as a lightweight **fan-out → verify → merge** pipeline (see Pipeline below). No per-phase user gates — spawn, collect, verify, merge, done.

## Pipeline

1. **holistic** — inline, strong model: eligibility + summary + approach-eval
2. **gate** — which lenses apply? (by what the diff touches)
3. **lenses** — correctness / quality / security / tests, parallel subagents
4. **gate** — which findings are flagged `Needs verification: yes`?
5. **verify** flagged findings — parallel subagents
6. **merge** — inline: apply verdicts → confidence-score → filter → dedupe → severity → `<ws>/review-changes.md`

## Workspace

Establish a task identifier first — the branch name under review, the PR/MR number, or a short slug you derive and confirm. Set `<ws>` = `./tmp/<identifier>/`; **before creating it, check whether it already holds artifacts from unrelated work — if so, STOP and ask the user** rather than overwriting another review. Intermediates live in `<ws>/review-changes/`; the final report is `<ws>/review-changes.md` (one level up, a stable path for the caller). The `./tmp/review-changes/…` paths below are shorthand for `<ws>/review-changes/…` — pass the resolved `<ws>` into every sub-agent prompt.

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

## Step 0 — Work in the right repo, against a fresh base

Do this before Phase 1.

**PR/MR link or number → review it in a dedicated worktree.** Never review a PR in the user's working tree — check the branch out in its own worktree so their current state is untouched. Detect the platform from the remote (`github.com` → `gh`, `gitlab` → `glab`), read the PR's head and base branches, then create the worktree the first time or refresh it from remote if it already exists:

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

Rebase conflict on refresh is rare — if `pull --rebase` reports one, STOP and ask the user; do not resolve it yourself. Set `BASE=origin/<base>`, run every phase from inside `$WT`, resolve `<ws>` under `$WT`, and leave the worktree in place — surface its path in the report so the user can `git worktree remove "$WT"` later. The PR resolved both repo and base, so skip the two traps below.

**Otherwise — a local branch or uncommitted work — infer repo and base:**

- **Repo.** Often not the current dir (you might be in `~/git-repos/personal` while the conversation is about `quant-trading/`). Infer it from the conversation (files named, IDE selection) and work from inside it. If the current dir isn't a git repo and the target is unclear, ask.
- **Base.** Use the base the user named (branch/tag/PR target); else `git fetch origin` and diff against the remote default branch (`origin/HEAD`, falling back to `origin/main`/`master`) — the local ref is usually stale. Fall back to `HEAD~1` only when there's no base branch at all (say so).

Scope: branch/PR → committed since `$BASE`; uncommitted → also `git status --short`; ambiguous → committed-since-base. Tell each subagent the repo dir and base.

## Phases

1. **Holistic (inline).** Run `node-holistic.md` from inside the repo, against `$BASE` from Step 0: eligibility (empty/trivial diff -> say so and stop, or do a single inline pass and skip the fan-out), changes summary, approach evaluation. Write `HOLISTIC.md`. **Gate:** if eligibility stops the review, stop.
2. **Lens gate.** Always run correctness, quality, security; run tests only if the diff adds/modifies test files. State which lenses and why before spawning.
3. **Lenses (parallel subagents).** Each reads its node file + `lens-common.md` + `HOLISTIC.md`, sees the changes via `git diff "$BASE"` from inside the repo, reviews ONLY the diff, writes `LENS_<name>.md`, and reports finding count + highest severity.
4. **Verification (parallel subagents).** Lenses are **trusted by default**. Verify only findings marked `Needs verification: yes` — the lens flagged something it couldn't confirm from the diff alone (behavior outside the diff, a caller's actual input, a runtime assumption, a guard that may exist elsewhere). Batch 2-4 flagged findings by shared file; each verifier resolves the flagged uncertainty against the real code and writes `VERDICT_<batch>.md`. Skip the phase entirely if nothing is flagged.
5. **Merge (inline).** Apply verdicts — REFUTED -> drop; CONFIRMED -> keep with the verifier's adjusted severity; UNCERTAIN -> score conservatively (usually falls below the filter); trusted (never-flagged) findings -> carry through as-is. Then score each survivor 0-100 for "real, in-scope issue", **drop everything < 80**, dedupe by file+line (keep highest severity), normalize severity. Write `<ws>/review-changes.md`. If nothing survives, say the changes look good.

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
