---
name: review-changes
description: Senior engineer code review analyzing diffs for correctness, security, performance, edge cases, and best practices with severity-based findings. Use when reviewing code, checking changes, or when user says "review my changes", "code review", "review this diff", or "check my code".
---

# Review Changes

You are the **orchestrator** for an autonomous code review, running in the main session so you can see the conversation — the target to review, the base, and any context the user gave. You are a **thin coordinator**: resolve what to review, then spawn a sub-agent for every phase — holistic, each lens, each verifier, and the merge. You never read a diff or a lens file yourself; you spawn, collect short summaries, route, and relay. The heavy reading stays in the sub-agents, out of the session's context.

This is a lightweight **fan-out → verify → merge** pipeline, not a stateful workflow: no per-phase user gates — spawn, collect, verify, merge, done.

## Step 0 — Work in the right repo, against a fresh base

Resolve the target from the conversation, then get these right — each is a common way the review goes wrong. Pass the repo dir and `$BASE` to every sub-agent.

- **No target.** If nothing resolves — no PR/MR, no branch, no uncommitted work — do NOT review whatever happens to be checked out. Ask which target.
- **Wrong repo.** Often not the current dir (you may be in `~/git-repos/personal` while the target is `quant-trading/`). Infer it from the conversation (files named, IDE selection); if the current dir isn't a git repo and the target is unclear, ask.
- **PR/MR reviewed in place.** Never review a PR in the user's working tree. Check it out in its own worktree (`../<repo>-pr-<num>` at `origin/<head>`; refresh from remote if it already exists, and if `pull --rebase` conflicts, stop and ask). Run every phase from there, set `BASE=origin/<base>`, resolve `<ws>` under it, and surface the worktree path in the report. Platform from the remote: `github.com`→`gh`, `gitlab`→`glab`.
- **Stale base.** Diff against the remote default (`git fetch origin`; `origin/HEAD` → `origin/main`/`master`), not a local ref that's behind. Use the base the user named if they gave one; `HEAD~1` only when there's no base branch at all (say so).
- **Wrong scope.** branch/PR → committed since `$BASE`; uncommitted → also `git status --short`; ambiguous → committed-since-base.

## Pipeline

Order and who-runs-each — the source of truth for the *flow*. Models live in **Model Selection**, paths in **Workspace**, per-phase detail in the `nodes/` files; point every lens/verifier subagent at its matching node file.

1. **holistic** — sub-agent → `HOLISTIC.md` + eligibility verdict
2. **gate** — which lenses apply? (by what the diff touches, plus holistic's perf-sensitive signal)
3. **lenses** — parallel subagents
4. **gate** — which findings did the lenses report as `Needs verification: yes`?
5. **verify** flagged findings — parallel subagents
6. **merge** — sub-agent → `<ws>/review-changes.md`

## Orchestrator Rules

You (the main session):
- **Resolve the target** from the conversation (Step 0) — the one thing only you can see. Pass the repo dir, `$BASE`, and `<ws>` into every sub-agent prompt.
- **Spawn a holistic sub-agent** (strong model) — it reads the whole diff, writes `HOLISTIC.md`, and returns the eligibility verdict you gate on. It produces the shared framing every lens depends on.
- **Spawn lens sub-agents in parallel** (a single message with multiple `Agent` calls) so they run concurrently.
- **Spawn verifier sub-agents** only for findings a lens reported `Needs verification: yes` — they resolve the flagged uncertainty against the real code. Findings the lens confirmed itself are trusted and skip this step.
- **Spawn a merge sub-agent** (strong model) — it reads every `LENS_*.md` and `VERDICT_*.md`, applies verdicts, scores, filters, dedupes, and writes the final report.

You MUST NOT:
- Read the raw git diff or a `LENS_*.md` yourself, or output diff/command output to the user
- **Do the review by hand.** Every phase is a sub-agent. If a phase can't run — no target resolved, a sub-agent bailed — fix the input and re-spawn; never substitute your own inline review for the pipeline. A bailed phase means re-spawn, not freelance.

## Model Selection (cost lever)

The `Agent` tool accepts a per-call `model` parameter (`"haiku" | "sonnet" | "opus"`).
- **holistic, merge** → omit `model` (session default / strongest). Holistic sets the shared framing every lens trusts; merge does the scoring and final judgment — neither should be discounted.
- **correctness, quality, tests, performance** → `model: "sonnet"` — focused, mostly mechanical lens work (performance traces magnitude across files, but the judgment stays mechanical).
- **security** → omit `model` (use the session default / strongest available). Cheap security review gives false confidence; this is the one lens not to discount. It also needs to trace data flow *across* files, not just read the diff.
- **verifiers** → `model: "sonnet"` by default, but **omit `model` for any batch containing a security finding** — verifying a security claim cheaply gives the same false confidence as reviewing it cheaply.

## Workspace

Establish `<ws>` = `./tmp/<identifier>/` first (identifier = branch name, PR/MR number, or a short slug). If `<ws>` already holds an unrelated review's artifacts, STOP and ask. Every sub-agent gets `<ws>`: intermediates go under `<ws>/review-changes/`, the final report to `<ws>/review-changes.md`. Node files write `./tmp/review-changes/…` as shorthand for `<ws>/review-changes/…`.

**Spawning convention (applies to every phase):** point the sub-agent at its `nodes/*.md` — the real instructions live there, don't restate them — and give it the repo dir, `$BASE`, and `<ws>`. Models per phase are in Model Selection above.

## Phase 1: Holistic (sub-agent)

Spawn `node-holistic.md`. It reads the diff, writes `HOLISTIC.md` (shared context for the lenses), and returns an **eligibility verdict** plus a **`Perf-sensitive: yes/no`** signal. Gate the pipeline on the eligibility verdict; hold the perf-sensitive signal for the Phase 2 lens gate.
- **stop** (no changes) → relay and finish.
- **single-inline-pass** (trivial diff) → it already wrote the final `<ws>/review-changes.md`; relay its summary and finish.
- **proceed-with-fan-out** → continue.

## Phase 2: Lens gate

Pick lenses by what the diff touches — don't always run all of them. **correctness, quality, security** → always; **tests** → only if the diff touches test files; **performance** → only if holistic reported `Perf-sensitive: yes`. State which and why before spawning.

## Phase 3: Lenses (parallel)

Spawn every applicable lens in **one message**, each on its `node-lens-<name>.md` + `lens-common.md`. Each writes `LENS_<name>.md` and reports back: finding count, top severity, and for every `Needs verification: yes` finding a one-line entry (lens, `file:line`, severity, what to check) — so you can route it without opening the file.

## Phase 4: Verification (parallel)

Lenses are **trusted by default**; only their `Needs verification: yes` findings get checked. Triage from what the lenses reported back — do **not** open `LENS_*.md`. If none were flagged, skip to Phase 5. Otherwise batch the flagged findings **2–4 by shared file/module**, spawn `node-verify.md` in **one message**; each writes `VERDICT_<batch>.md` and reports CONFIRMED / REFUTED / UNCERTAIN.

## Phase 5: Merge (sub-agent)

Spawn `node-merge.md`. It reads every `HOLISTIC.md` / `LENS_*.md` / `VERDICT_*.md`, applies verdicts, scores, filters, dedupes, writes the final `<ws>/review-changes.md`, and returns the recommendation + severity counts. Relay the recommendation and the report path; don't re-list findings inline.

## Related Skills

- `@test-quality-reviewer` — Detailed test quality analysis using 4 Pillars framework (the tests lens may defer to it)
- `@code-refactoring` — Structured refactoring suggestions
- `@commit-plan` — Organize reviewed changes into semantic commits
