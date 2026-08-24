---
name: review-changes
description: Senior-level diff review via parallel review-lens subagents — correctness, security, architecture and design fit, quality, tests, performance — with a verification pass and a confidence-scored merge that labels each finding by origin (introduced by this change vs pre-existing). Use when the user asks for a code review, PR review, or pre-merge validation.
---

# Review Changes

Orchestrate a code review as a lightweight **review → verify → merge** pipeline (see Pipeline below). No per-phase user gates — spawn, collect, verify, merge, done. How wide the review phase spreads is set by **Review Depth** below, which is what keeps a small diff from costing what a large one does.

## Pipeline

1. **holistic** — inline, strong model: eligibility + **review depth** + summary + approach-eval
2. **gate** — depth decides *how many subagents* carry the lenses; applicability decides *which lenses* run (correctness is the floor)
3. **lenses** — correctness / security / architecture / quality / tests / performance, parallel subagents grouped per depth
4. **gate** — which findings are flagged `Needs verification: yes`, and how many batches does the depth allow?
5. **verify** flagged findings — parallel subagents
6. **merge** — inline: apply verdicts → confidence-score → filter → dedupe → severity → `<ws>/review-changes.md`

## Review Depth (the main cost lever)

Holistic and merge run inline, so every *subagent* you spawn is a lens or a verifier — and each pays the same fixed overhead before it reads any diff: its own system prompt and tool schemas, the project's rule files, its node file, `HOLISTIC.md`. An unconditional six-lens fan-out plus verifiers is 8–10 subagents, charging a 40-line diff nearly what it charges a 3000-line one. Holistic measures the diff and returns a **depth**; you route on it.

Applicability and depth are independent and both bind: **a lens holistic marked `no` never runs at any depth**, and a lens it marked `yes` always gets reviewed — depth only changes how many subagents share the work.

- **`compact`** → **one** grouped subagent (`node-lens-grouped.md`) covering *every* applicable lens in a single pass → `LENS_grouped-all.md`. Holistic only returns this depth when security and architecture both came back `no`, so this group is always mechanical lenses only.
- **`grouped`** → **up to two** grouped subagents, spawned in parallel:
  - `mechanical` — correctness / quality / tests / performance, intersected with what holistic marked `yes` → `LENS_grouped-mechanical.md`
  - `deep` — security / architecture, intersected with what holistic marked `yes`; **skip this subagent entirely if neither fired** → `LENS_grouped-deep.md`
- **`fan-out`** → **one subagent per applicable lens**, as before → `LENS_<name>.md` each.

Security and architecture never share a subagent with the mechanical lenses. They read across files and carry the judgment calls, so they get their own subagent and stay on the strong model at every depth that runs them — grouping cuts subagent count, never the depth of a lens.

**Route on holistic's depth; do not re-derive it.** You measured the diff in phase 1 and applied the escalation rules there. Upgrade a depth only if the user asked for a thorough review or named a risk in the conversation. Never downgrade one to save tokens.

## Workspace

Establish a task identifier first — the branch name under review, the PR/MR number, or a short slug you derive and confirm. Set `<ws>` = `./tmp/<identifier>/`; **before creating it, check whether it already holds artifacts from unrelated work — if so, STOP and ask the user** rather than overwriting another review. Intermediates live in `<ws>/review-changes/`; the final report is `<ws>/review-changes.md` (one level up, a stable path for the caller). The `./tmp/review-changes/…` paths below are shorthand for `<ws>/review-changes/…` — pass the resolved `<ws>` into every sub-agent prompt.

- `HOLISTIC.md` — summary + approach evaluation (you, Phase 1; shared with every lens)
- `DIFF.patch` — the diff, captured once in Phase 1; every lens and verifier reads it instead of re-running `git diff`
- `LENS_<name>.md` — per-lens findings
- `VERDICT_<batch>.md` — per-batch verification verdicts

## Orchestrator Responsibilities

- Run the holistic phase **inline on the strong model** — it needs the whole picture, produces the framing every lens depends on, and sets the depth every later phase costs.
- Spawn lens subagents **in parallel**, one per lens or one per group per the depth; pass each its node file(s) + `lens-common.md` + `HOLISTIC.md`. Use a smaller model for the mechanical lenses (correctness/quality/tests/performance); keep **security and architecture on the strong model** at every depth (cheap security review gives false confidence, and architecture reads across files — siblings, schema, adjacent layers — on a judgment call that degrades into style nits when discounted).
- Spawn verifier subagents **only** for findings flagged `Needs verification: yes`, up to the depth's batch cap; trust the rest. Keep a verifier batch on the strong model if it contains a security finding.
- Merge **inline**: apply verdicts, score, filter, dedupe, write the report yourself.
- Never output the raw diff, and never comment on code outside the diff.
- **Say what the review cost in coverage** — name the depth and the skipped lenses when you report the result. A `compact` review that reads like a full one is the failure mode this ladder introduces.

## Phase Entry Points

- `nodes/node-holistic.md` — run inline (Phase 1)
- `nodes/lens-common.md` — shared lens rules (every lens reads this)
- `nodes/node-lens-grouped.md` — a subagent carrying several lenses at once (`compact` and `grouped` depths)
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

1. **Holistic (inline).** Run `node-holistic.md` from inside the repo, against `$BASE` from Step 0: eligibility (empty/trivial diff -> say so and stop, or do a single inline pass and skip the fan-out), a **review depth**, changes summary, approach evaluation, a **Design Concerns to Investigate** list (which the architecture lens must resolve), and a **Lens Applicability** block — a `yes`/`no` plus a reason for each of the six lenses. Write `HOLISTIC.md`. **Gate:** if eligibility stops the review, stop; otherwise hold the depth and the applicability block for the next gate.
2. **Depth + lens gate.** Two verdicts combine here. **Applicability** decides which lenses run: **correctness** is the floor and always runs; security, architecture, quality, tests, and performance each run only on a `yes`. **Depth** decides how many subagents carry them, per **Review Depth** above. You assessed the diff in phase 1, so route off those verdicts rather than re-deriving either. State the depth, which lenses you are running, how they are grouped, and the reason for each skip, before spawning — a skipped lens is a gap in coverage, and a cheaper depth is a gap in how independently each lens was applied.
3. **Lenses (parallel subagents).** Spawn what the depth calls for: one grouped subagent at `compact`, up to two at `grouped`, one per lens at `fan-out`. Each reads its node file(s) + `lens-common.md` + `HOLISTIC.md`, sees the changes via `DIFF.patch` (captured once in phase 1 — they do not re-run `git diff`), reviews ONLY what the change is answerable for (the diff, plus what it newly reaches), labels each finding's **Origin**, writes its lens file, and reports finding count (per lens when grouped) + highest severity. A grouped subagent also tags each finding with its **`Lens`** and lists a per-lens **Coverage** block.
4. **Verification (parallel subagents, capped by depth).** Lenses are **trusted by default**. Verify only findings marked `Needs verification: yes` — the lens flagged something it couldn't confirm from the diff alone (behavior outside the diff, a caller's actual input, a runtime assumption, a guard that may exist elsewhere). Batch 2-4 flagged findings by shared file; each verifier resolves the flagged uncertainty against the real code and writes `VERDICT_<batch>.md`. Skip the phase entirely if nothing is flagged. Cap the batches by depth — **`compact`** at most 1, **`grouped`** at most 2, **`fan-out`** uncapped — and when a cap bites, spend it on flagged **MUST FIX** findings first, then SHOULD FIX; never on a NIT.
5. **Merge (inline).** Apply verdicts — REFUTED -> drop; CONFIRMED -> keep with the verifier's adjusted severity; UNCERTAIN -> score conservatively; trusted (findings the lens marked `Needs verification: no`) -> carry through as-is. A finding flagged `yes` that **never got verified** because the depth capped the phase is **not** trusted: treat it exactly as UNCERTAIN and mark it "(unverified)" if it survives. Then score, filter, and dedupe per **Scoring and Filter** below, normalize severity, and write `<ws>/review-changes.md`. If nothing survives, say the changes look good.

**Reading grouped lens files at merge.** A `LENS_grouped-<group>.md` carries several lenses, so lens count and file count no longer match: take each finding's lens from its **`Lens`** field rather than the filename, and read the file's **Coverage** block to see which lenses it covered. A lens named there with no findings was **reviewed and clean** — report it as reviewed, not skipped. Only a lens holistic marked `yes` that appears in neither a lens file nor a Coverage block is genuinely unreviewed; say so plainly.

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

Open with a **Summary** and a **Coverage** block. Coverage states the **depth** the review ran at (with the file and line counts from holistic), which lenses ran, and each skipped lens with its one-line reason from the applicability block — a skipped lens is unreviewed, not clean, and the reader has to be able to see the gap. It also states the **verification shortfall**: how many flagged findings were checked and how many the depth cap left unverified. Follow with an **origin split**: how many findings this change introduced, how many are pre-existing on lines it touched, how many are pre-existing but newly reached by it.

**Number every finding.** Write each one as `### 1. [Issue Title]`, `### 2. ...` — sequential, starting at 1, in the order the report lists them. Assign the numbers **last**, once verdicts, filtering, dedupe, and root-above-symptom ordering have settled the order. This is mandatory: the number is how the reader cites a finding back ("fix 2 and 4"), and an unnumbered report forces them to quote titles instead. Never leave a gap where a dropped finding was, and never carry a number over from a lens file — the report's numbering is its own.

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
