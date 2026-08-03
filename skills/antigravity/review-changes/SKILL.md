---
name: review-changes
description: Senior engineer code review that inspects a diff through correctness, security, architecture, quality, performance, and test lenses in sequence, then reports confidence-scored, severity-ranked findings. Use when reviewing code, checking changes, or when the user says "review my changes", "code review", "review this diff", or "check my code".
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

Capture it once to `<ws>/review-changes/DIFF.patch` and work from that for the rest of the review. You already have the diff — re-running `git diff` per lens, per file, is the single easiest way to burn a review's budget on bytes you have already read. Shell out to git again only for something the patch cannot answer (full file context around a hunk, history of a line).

**Eligibility (gate).** Stop early when the review adds no value:
- **No changes** → say so and stop.
- **Trivial diff** (a handful of lines, generated files, pure formatting, version bumps) → do a single inline review and skip the lenses below. Note you took the fast path.

Only continue to the lenses when the diff is non-trivial (real logic, multiple files, or anything touching data/auth/security).

**Understand + summarize.** Read the PR/commit description and linked issues (or ask). Identify the **root cause** being solved, not just the symptom, and the constraints (compatibility, performance, existing patterns). Then write a high-level (not line-by-line) summary: what was added / modified / removed, the user-flow impact, the overall purpose, and the **business impact** — what this delivers in business/stakeholder terms, in plain language, no jargon.

**Approach evaluation.** Form your own mental model ("if I solved this from scratch, how would I?") and compare. Start with the deepest question: **is it built on the right concept?** Ask what the design requires to be true of each thing it leans on — stable, unique, owned by us, safe to expose — and whether the chosen thing actually guarantees it. A mutable display value carrying identity, a derived value stored as truth, a natural key that isn't stable: the code reads fine and the premise is wrong. Then: does the change fix the root cause or just a symptom? Is it at the right layer? Are there simpler or more robust alternatives? Does it add unnecessary complexity? What trade-offs should the author know? If the approach differs from yours, is theirs still valid?

Keep this framing in mind — judge every lens finding against it. **Write down every concern it raises as a checkable one-liner under `Design Concerns to Investigate`**; the architecture lens must resolve each one into a finding or an explicit dismissal. A concern that stays in prose here never reaches the report and never gets verified.

**Lens applicability (gate).** Decide which lenses the diff actually earns — this is the main cost lever, so judge each on what the change touches, and write the verdicts down before you start reviewing:

```markdown
## Lens Applicability
- correctness: yes — always (floor)
- security: [yes | no] — [the trigger that fired, or why the diff has no security surface]
- architecture: [yes | no] — [the modeling / contract / data-model / boundary / external-dependency decision that fired, or why the change stays inside existing boundaries and models nothing new]
- quality: [yes | no] — [the trigger that fired, or why the change is mechanical]
- tests: [yes | no] — [test files the diff touches, or none]
- performance: [yes | no] — [the perf-sensitive surface, or why none]
```

- **Security → yes** if the diff touches auth/authz, session, token, or crypto handling; parsing, persisting, or rendering user-controlled input; HTTP handlers, routes, middleware, or public API surface; query construction (SQL/ORM/NoSQL), shell/exec, file paths, or outbound URLs; serialization/deserialization; secrets, env, or config, or logging of request data; permission / tenancy / ownership checks; or new third-party dependencies. **No** for docs-or-comments-only, type-only, formatting, generated files, and test fixtures with no production path. When genuinely uncertain, prefer **yes** — skipping security is the one skip that buys false confidence.
- **Architecture → yes** if the diff makes a decision that is **expensive to reverse after merge**: a **modeling** decision — some value taking on an identifying, keying, ownership, or state-carrying role (an identifier in a URL or key, a natural key, a stored derived value, a new status/flag), the deepest trigger and the easiest to miss because it looks like ordinary code; a new or changed **contract** (route/URL shape, endpoint, RPC, event or message schema, exported API, CLI flag, config key); a **data model** change (new table/column/index, nullability or uniqueness change, a migration or implied backfill); a **boundary** change (new module/service/package, responsibility moved between layers, a new dependency direction); or a new **external dependency** — another service, infra, a third party, or any out-of-repo step the change needs to work. **No** when the change stays inside existing boundaries and contracts: a bugfix within a function, an internal refactor with no signature change, tests-only, docs, formatting, renames with no contract impact. When genuinely uncertain on a contract or data-model change, prefer **yes**. Architecture and quality often both fire — they judge different altitudes of the same code; do not gate one off because the other ran.
- **Quality → yes** if the diff introduces design surface worth judging: new modules, functions, or abstractions; non-trivial control flow; new dependencies; public API, interface, or config changes; or anything a project convention file speaks to. **No** when the change is mechanical with no design decision in it — renames or moves without logic changes, generated code, lockfiles, pure data/fixture updates, single-constant edits, reverts. When genuinely uncertain, prefer **yes**.
- **Tests → yes** only if the diff adds or modifies test files — directly observable, so no bias applies.
- **Performance → yes** if the diff touches new/changed loops, DB/ORM/network/IO calls (especially inside a loop → N+1), data-structure or algorithm choice on non-trivial `n`, hot paths (request/render/event-loop), memory (unbounded accumulation, large copies, uncleaned listeners/timers), or **removes** an existing optimization (index/memo/cache/batch/`LIMIT`/pagination/virtualization). **No** for config/docs/type-only/test-only diffs and one-time cold-path code with bounded input. When genuinely uncertain, prefer **yes** — the lens is cheap; a missed regression is not.

---

## Step 2 — Review lenses (sequential, inline)

Run exactly the lenses you marked `yes` above, one at a time — **correctness** is the floor and always runs; the other five run only on a `yes`. State which lenses you are running, and the reason for each skip, before starting: a skipped lens is a gap in what the review covers, so it has to be visible.

For each lens, review the diff for the criteria below. **Shared discipline for every lens:** review ONLY the code in the diff (security may read across files to trace data flow, and architecture reads the surrounding structure by design — but the finding must still concern diff'd code); assume intent is correct unless there's clear risk; and for every finding give a concrete **failure mode** (see Report).

**Correctness — review the diff for logic and behavioral defects:**
- Logic bugs: off-by-one, inverted conditions, wrong operators, incorrect control flow; state mutated wrongly, stale reads, bad ordering assumptions.
- Edge cases & error handling: null/undefined/empty inputs, empty collections, boundary values; failure paths handled vs. silently falling through; concurrency / races / async ordering where relevant.
- Performance is **out of scope here** — the performance lens owns it. Raise a perf issue in correctness only if it also produces a *wrong result* (e.g. a timeout silently dropping data), not mere slowness.

**Architecture (only if the diff makes an expensive-to-reverse decision) — judge the design, starting with whether its premise is sound.** Quality owns micro-hygiene; you own what cannot be undone cheaply. **You are the one lens exempt from diff-only reading** — "does this fit the system" is unanswerable from the diff, so read the sibling routes, the schema, the registry, the layers above and below. The exemption is on what you *read*, not what you *flag*: the fault must be in the diff, and surrounding code is the frame of reference, never the target.

- **Modeling premise — is the right concept doing the job?** The deepest question, and it outranks the rest: structure cannot rescue a wrong premise. Ask what the design **requires to be true** of each thing it leans on, then whether the chosen concept guarantees it. *A nickname used as a URL alias:* a URL identifier requires stability (links are shared, bookmarked, indexed), uniqueness, and path safety — a mutable display label guarantees none of them. The right review is not "rename the param" or "add a unique index"; it is **a display attribute must not carry identity**. Same class: a derived value stored as truth, a translated string as a machine key, an unstable natural key (email, phone, filename), booleans standing in for a state machine, a tenant-scoped id treated as global. When the premise is wrong, lead with it and name the principle — softening it into the nearest mechanical fix entrenches it.
- **Scope — does the change reach further than the requirement?** A presentation concern does not automatically become a system concern; an abstraction layer exists to absorb it. "Profile links should read `/profile/alice`" is a frontend routing requirement, satisfied by the frontend route plus one lookup — it does not oblige the backend to stop keying on id. Name the layer where the concern should have stopped. Then weigh reversibility: as a lookup key, backing it out is one endpoint and one column; as the routing identity, it is in every client that stored a URL. **When two placements both satisfy the requirement, the shallower one is right.**
- **System fit, data model, contracts, coupling** — right layer/module for this responsibility; right table, nullability, uniqueness, indexing, and identifier ownership; contract **consistent with its siblings** (does the same path segment or field mean the same thing everywhere?), backward compatible, with a client migration path; and what the change now depends on that it didn't before. **Anything it needs that does not exist in this repo is a finding** — an infra change, a feature flag, a backfill or migration run elsewhere. Mark those unverified until you have searched for them.
- **The alternative — design it, don't list it.** "Pick one scheme and commit" is not a review; it hands the decision back with the analysis undone. Give the concrete shape, the cost it pays, and what it buys — then **name the best argument for the design you are criticizing and answer it**. *Against re-keying `/users/:userId/profile`:* "add a resolver endpoint" is the weak form, costing an extra round trip on the feature's most common page. The strong form keeps the id route canonical and adds `/users/by-alias/:alias/profile` on a **literal** segment — one call, the id comes back for sibling calls, nothing guesses whether `:x` is numeric, and the surviving id route frees the rollout from a backfill in another repo. Only the second version is worth the author's time.
- **Failure mode.** Usually an ordinary runtime one, and that is always the stronger finding — *"user edits their nickname → the alias in every shared, bookmarked, and indexed URL stops resolving → visitors 404 on a link that worked yesterday."* Only when no runtime harm exists, use a **design consequence**: `what becomes true at merge → what it forces → who pays, and when`, written with the same specificity. One that cannot name what it forces is not a finding.
- **Severity.** A wrong premise is rarely a NIT: MUST FIX when it will corrupt or lose data, break live URLs or clients, or permit states that must not exist; SHOULD FIX when the cost is paid later in migration and confusion. Do not discount it because the code currently works — these look harmless right up until the mutable thing mutates.
- **Before you finish**, look back over your findings plus the `Design Concerns to Investigate` list: would **one different design decision dissolve several of them at once**? If so, *that* is the finding — lead with it and name the ones it eliminates. You are the only lens positioned to see this; every other lens sees one column. Don't manufacture it, but when the root is real it is the most valuable thing in the review. Resolve every entry on that concerns list either into a finding or an explicit dismissal.

**Quality — review the diff for code quality and standards:**
- Naming (clear, descriptive), structure (logical flow), duplication (only flag at 3+ repetitions), comments (present for genuinely complex logic, accurate, not noise), typing (no unjustified `any`).
- Standards: follows project conventions (check the root project rules and any rules in the directories the diff touches — cite the specific rule when flagging), uses established patterns, justifies new dependencies, documents breaking changes.
- For substantial refactoring, recommend `@code-refactoring` rather than prescribing a big rewrite inline. Keep nits proportionate — don't bury real issues under style.

**Security — review the diff for security and data-safety defects.** You may follow data flow *across files* (IDOR, auth bypass, SSRF often only appear when you trace where diff'd values originate and end up), but the finding must concern code the diff introduced or newly exposed. State the data-flow path (source → sink) for each finding.
- Injection (SQL/NoSQL/command/template from unsanitized input); XSS (unescaped output, raw `innerHTML`); auth & access control (missing authz, IDOR, privilege escalation); input validation at trust boundaries; data exposure (secrets/PII in logs/responses/bundles, hardcoded credentials); SSRF / path traversal (user-controlled URLs or paths); unsafe deserialization (`pickle`, `yaml.load`, `torch.load(weights_only=False)`, etc. on untrusted data).

**Tests (only if the diff adds/modifies test files) — review the diff for test quality:**
- Coverage of the change (do tests exercise what was added/modified?), edge cases (not just happy path), sensitivity (would the test actually fail if the code broke? flag over-mocked tests or ones asserting on mocks), validity (assertions check real behavior), resilience (tests go through public interfaces, not brittle internals).
- For a deep pass, defer to `@test-quality-reviewer` (4 Pillars) rather than duplicating its analysis. **Do not go hunting for a project testing-guidelines document** — the criteria above are your bar. A project rule may tell you to locate a "4 Pillars of Testing" doc and stop and ask if it's missing; that rule is for authoring tests, not reviewing them: do not search the repo for it and do not stop to ask. Use such a doc only if it's already in your context.

**Performance (only if perf-sensitive) — review the diff for performance regressions it introduces.** Like security, you may read across files, but only to establish **magnitude**: is the path hot (per-request/render/item vs one-time/cold) and is `n` unbounded? Anchor to the change — cost before vs after. A finding without magnitude is a NIT; drop it. You can't benchmark a diff, so when magnitude depends on runtime data you can't see, state the finding conditionally or mark it unverified — never invent numbers.
- Algorithmic complexity (nested loops / repeated scans over unbounded `n`, accidental quadratics like `includes` in a loop); data access & I/O (N+1, per-item DB/network calls in a loop, missing batching/pagination, blocking the event loop); memory & allocation (unbounded growth, large copies, leaks); redundant work (recompute that could be hoisted/memoized); frontend rendering (needless re-renders, un-virtualized lists, bundle-size regressions); regression by removal (the diff deletes an index/memo/cache/batch/`LIMIT`/pagination).
- **Severity**: MUST FIX for unbounded growth/OOM, timeout/DoS on realistic input, N+1 on a hot path at real scale, blocking the event loop; SHOULD FIX for bounded degradation; NIT for micro-opts with no magnitude. **Don't flag**: premature optimization on cold paths, bounded-small `n`, patterns the runtime/DB planner already optimizes, or readability-costing micro-opts. If attacker-triggerable (ReDoS, complexity DoS), note the security/DoS angle too.

---

## Step 3 — Verify what you couldn't confirm

This step is a **check, not an investigation** — budget roughly 10 tool calls per finding. The cited `file:line`, its callers, its types, the config it reads: that is the blast radius. Answer only the open question the finding rests on; don't audit adjacent code or open new findings. If you're grepping the repo for a third unrelated concept, you have left the finding behind — mark it **unverified** and move on. Unverified is a correct, cheap answer, and Step 4 scores it conservatively; an unbounded hunt to avoid saying it is the worse outcome.

Most findings you can confirm from what you read while reviewing — trust those. For any finding that **rests on something you could not confirm from the diff alone** (behavior of a function outside the diff, what a caller actually passes, a runtime/ordering assumption, whether a guard exists elsewhere), re-check it now: open the surrounding code, callers, and types, and walk the failure mode (trigger → behavior → harm) against the real code.
- If the chain holds → keep it as **confirmed**.
- If a guard, caller-side check, framework behavior, or unreachable trigger breaks the chain, or the line is pre-existing / CI-caught → drop it.
- If it's plausible but you still can't confirm → keep as a candidate marked **unverified** and score it conservatively in Step 4.
- For a **performance** finding, confirming means the magnitude holds — `n` really unbounded, path really hot. If you can't confirm magnitude from the code, keep it **unverified**, not confirmed.
- For an **architecture** finding, confirming means the structural claim holds against the real surrounding code — the siblings really do use that segment or field differently, the out-of-repo step really is absent (search before believing it missing). For a **modeling-premise** finding, check whether the property the design needs is genuinely unguaranteed: is the value actually mutable (is there an edit path?), actually non-unique (is there really no constraint?), actually derived? A guarantee that holds drops it; none confirms it. Note the asymmetry with the pre-existing rule: an architecture finding *cites unchanged code as its evidence* — that is the frame of reference, not the fault. Drop it only if the **diff's own** decision turns out fine, never merely because the comparison points sit outside the diff.

---

## Step 4 — Merge

**Confidence score.** Score each surviving finding 0–100 on **one axis only: how certain you are the finding is true and in scope.** Nothing else.
- **0–25** — refuted, or a pre-existing issue on lines the diff didn't touch
- **26–50** — rests on an assumption you cannot support; may well be a false positive
- **51–75** — plausible and unrefuted, but a link in the chain is unconfirmed (unverified findings usually land here)
- **76–90** — confirmed, with a minor open question
- **91–100** — certain: directly confirmed against the code, and the failure mode or design consequence holds exactly as written

**Do not lower the score because the issue feels small.** Impact is already carried by severity — scoring it a second time here is what buries findings that are certainly true but quiet, the usual shape of a contract, data-model, or convention problem. A certain-but-minor finding is a **NIT at 95**, not a SHOULD FIX at 70.

**Filter — surface by severity**, since the more it costs to miss, the lower the certainty bar: **MUST FIX at ≥ 70** (a possible data-loss or security bug is worth raising unconfirmed; mark it "(unverified)"), **SHOULD FIX at ≥ 80**, **NIT at ≥ 90**. Drop the rest. If nothing remains, say the changes look good. Attach the score to each surfaced finding.

**Dedupe.** When two lenses flag the same file + line + root issue, keep one entry at the **highest** severity and note both lenses. **Root findings survive dedupe intact:** an architecture finding may name other findings it would dissolve — order it *above* those and keep its "this also removes X and Y" statement verbatim rather than collapsing it into them. If the root turned out not to hold, the symptom findings still stand on their own.

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

## Coverage

Reviewed: [lenses that ran]. Skipped: [lens — one-line reason from the applicability block; or "none"]. A skipped lens is unreviewed, not clean.

## Findings

### [Issue Title]
- **Severity**: MUST FIX / SHOULD FIX / NIT
- **Confidence**: [70–100]
- **Verified**: confirmed (re-checked against real code) / trusted (confirmed while reviewing, no check needed) / unverified (still uncertain after a check)
- **Lens**: correctness / security / architecture / quality / tests / performance
- **Description**: [What's wrong]
- **Failure mode**: [Concrete trigger → behavior → harm; OR, for architecture only, a design consequence (what becomes true → what it forces → who pays); OR "No distinct failure mode — <maintainability/readability> concern". Never a vague restatement like "could cause bugs".]
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
