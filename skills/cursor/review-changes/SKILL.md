---
name: review-changes
description: Senior-level diff review via parallel review-lens subagents — correctness, security, architecture and design fit, quality, tests, performance — with a verification pass and a confidence-scored merge that labels each finding by origin (introduced by this change vs pre-existing). Use when the user asks for a code review, PR review, or pre-merge validation.
---

# Review Changes

Orchestrate a code review as a lightweight **fan-out → verify → merge** pipeline (see Pipeline below). No per-phase user gates — spawn, collect, verify, merge, done.

## Pipeline

1. **holistic** — inline, strong model: eligibility + summary + approach-eval
2. **gate** — run only the lenses holistic marked applicable (correctness is the floor)
3. **lenses** — correctness / security / architecture / quality / tests / performance, parallel subagents
4. **gate** — which findings are flagged `Needs verification: yes`?
5. **verify** flagged findings — parallel subagents
6. **merge** — inline: apply verdicts → confidence-score → filter → dedupe → severity → `<ws>/review-changes.md`

## Workspace

Establish a task identifier first — the branch name under review, the PR/MR number, or a short slug you derive and confirm. Set `<ws>` = `./tmp/<identifier>/`; **before creating it, check whether it already holds artifacts from unrelated work — if so, STOP and ask the user** rather than overwriting another review. Intermediates live in `<ws>/review-changes/`; the final report is `<ws>/review-changes.md` (one level up, a stable path for the caller). The `./tmp/review-changes/…` paths below are shorthand for `<ws>/review-changes/…` — pass the resolved `<ws>` into every sub-agent prompt.

- `HOLISTIC.md` — summary + approach evaluation (you, Phase 1; shared with every lens)
- `DIFF.patch` — the diff, captured once in Phase 1; every lens and verifier reads it instead of re-running `git diff`
- `LENS_<name>.md` — per-lens findings
- `VERDICT_<batch>.md` — per-batch verification verdicts

## Orchestrator Responsibilities

- Run the holistic phase **inline on the strong model** — it needs the whole picture and produces the framing every lens depends on.
- Spawn lens subagents **in parallel**; pass each its node file + `HOLISTIC.md`. Use a smaller model for correctness/quality/tests/performance; keep **security and architecture on the strong model** (cheap security review gives false confidence, and architecture reads across files — siblings, schema, adjacent layers — on a judgment call that degrades into style nits when discounted).
- Spawn verifier subagents **only** for findings flagged `Needs verification: yes`; trust the rest. Keep a verifier batch on the strong model if it contains a security finding.
- Merge **inline**: apply verdicts, score, filter, dedupe, write the report yourself.
- Never output the raw diff, and never comment on code outside the diff.

## Phase Entry Points

- `nodes/node-holistic.md` — run inline (Phase 1)
- `nodes/lens-common.md` — shared lens rules (every lens reads this)
- `nodes/node-lens-correctness.md`, `node-lens-security.md`, `node-lens-architecture.md`, `node-lens-quality.md`, `node-lens-tests.md`, `node-lens-performance.md`
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

1. **Holistic (inline).** Run `node-holistic.md` from inside the repo, against `$BASE` from Step 0: eligibility (empty/trivial diff -> say so and stop, or do a single inline pass and skip the fan-out), changes summary, approach evaluation, a **Design Concerns to Investigate** list (which the architecture lens must resolve), and a **Lens Applicability** block — a `yes`/`no` plus a reason for each of the six lenses. Write `HOLISTIC.md`. **Gate:** if eligibility stops the review, stop; otherwise hold the applicability block for the lens gate.
2. **Lens gate.** Run exactly the lenses holistic marked `yes` — you assessed the diff in phase 1, so route off those verdicts rather than re-deriving them. **correctness** is the floor and always runs; security, architecture, quality, tests, and performance each run only on a `yes`. State which lenses you are running, and the reason for each skip, before spawning — a skipped lens is a gap in what the review covers, so it has to be visible.
3. **Lenses (parallel subagents).** Each reads its node file + `lens-common.md` + `HOLISTIC.md`, sees the changes via `DIFF.patch` (captured once in phase 1 — they do not re-run `git diff`), reviews ONLY what the change is answerable for (the diff, plus what it newly reaches), labels each finding's **Origin**, writes `LENS_<name>.md`, and reports finding count + highest severity.
4. **Verification (parallel subagents).** Lenses are **trusted by default**. Verify only findings marked `Needs verification: yes` — the lens flagged something it couldn't confirm from the diff alone (behavior outside the diff, a caller's actual input, a runtime assumption, a guard that may exist elsewhere). Batch 2-4 flagged findings by shared file; each verifier resolves the flagged uncertainty against the real code and writes `VERDICT_<batch>.md`. Skip the phase entirely if nothing is flagged.
5. **Merge (inline).** Apply verdicts — REFUTED -> drop; CONFIRMED -> keep with the verifier's adjusted severity; UNCERTAIN -> score conservatively; trusted (never-flagged) findings -> carry through as-is. Then score, filter, and dedupe per **Scoring and Filter** below, normalize severity, and write `<ws>/review-changes.md`. If nothing survives, say the changes look good.

## Scoring and Filter

Score each surviving finding 0-100 on **one axis only: how certain you are the finding is true and in scope.** Nothing else.

- **0-25** — refuted, or an unrelated pre-existing issue this change neither reaches nor worsens
- **26-50** — rests on an assumption you cannot support; may well be a false positive
- **51-75** — plausible and unrefuted, but a link in the chain is unconfirmed (an UNCERTAIN verdict usually lands here)
- **76-90** — confirmed, with a minor open question
- **91-100** — certain: directly confirmed against the code, and the failure mode or design consequence holds exactly as written

**Do not lower the score because of Origin.** Origin is information for the reviewer, not a discount — a `pre-existing — touched` or `pre-existing — newly reached` finding is scored on the same one axis as any other. Carry each finding's Origin through to the report from the verdict when it was verified, otherwise from the lens; never re-derive it yourself.

**Do not lower the score because the issue feels small.** Impact is already carried by severity — scoring it a second time here is what buries findings that are certainly true but quiet, which is the usual shape of a contract, data-model, or convention problem. A certain-but-minor finding is a **NIT at 95**, not a SHOULD FIX at 70.

**Filter — surface by severity**, since the more it costs to miss, the lower the certainty bar: **MUST FIX at >=70** (a possible data-loss or security bug is worth raising unconfirmed; mark it "(unverified)"), **SHOULD FIX at >=80**, **NIT at >=90**. Drop the rest, and attach the score to each surfaced finding.

**Dedupe** by file + line + root issue, keeping the highest severity and noting both lenses. **Root findings survive dedupe intact:** the architecture lens may file a finding that names other findings it would dissolve — order it *above* the ones it names and keep its "this also removes X and Y" statement verbatim, rather than collapsing it into them. If a verifier refuted the root, the symptom findings still stand on their own.

## Report Format

Open with a **Summary** and a **Coverage** line — which lenses ran, and each skipped lens with its one-line reason from the applicability block. A skipped lens is unreviewed, not clean; the reader has to be able to see the gap. Follow it with an **origin split**: how many findings this change introduced, how many are pre-existing on lines it touched, how many are pre-existing but newly reached by it.

Each finding lists: **Severity**, **Confidence** (70-100), **Origin** (introduced by this change / pre-existing — touched by this change / pre-existing — newly reached by this change, plus the link the diff created; keep any "(unconfirmed)" marker), **Verified** (confirmed / trusted / unverified), **Lens** (correctness / security / architecture / quality / tests / performance), **Description**, **Failure mode** (concrete trigger -> behavior -> harm; for architecture only, a design consequence — what becomes true -> what it forces -> who pays; or `No distinct failure mode — <maintainability/readability> concern` — never a vague restatement), **Why it matters**, **Suggested fix**. End the report with **Positive Notes** and a **Recommendation**: safe to merge / merge with comments / needs changes.

## Severity

- **MUST FIX** — could cause bugs, security vulnerabilities, or data loss
- **SHOULD FIX** — important for maintainability, performance, or best practices
- **NIT** — minor style/consistency

## What NOT to flag

**Unrelated** pre-existing issues — untouched code this change neither reaches nor worsens (a pre-existing flaw on a line the diff touched, or one the diff newly reaches, is kept and labeled by Origin, not dropped); anything a linter/typechecker/compiler catches; pedantic nits; clearly intentional changes. Do not run the build or typecheck — that is CI's job.

## Related Skills

- `@test-quality-reviewer` — detailed test quality analysis (the tests lens may defer to it)
- `@code-refactoring` — structured refactoring suggestions
- `@commit-plan` — organize reviewed changes into semantic commits
