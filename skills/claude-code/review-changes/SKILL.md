---
name: review-changes
description: Senior engineer code review analyzing diffs for correctness, security, edge cases, and best practices with severity-based findings. Use when reviewing code, checking changes, or when user says "review my changes", "code review", "review this diff", or "check my code".
context: fork
---

# Review Changes

You are the **orchestrator** for an autonomous code review. You run a holistic pass yourself, fan out specialized review lenses as parallel sub-agents, spawn verifier sub-agents only for the findings a lens flagged as needing a code-level check, then merge the survivors into a single severity-ranked report.

This skill is a lightweight **fan-out → verify → merge** pipeline — NOT a heavy stateful workflow. There are no per-phase user gates; spawn, collect, verify, merge, done.

## Current Changes

Branch: !`git branch --show-current`
Changed files: !`git diff --name-only $(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null) 2>/dev/null || git diff --name-only HEAD~1`

## How This Works

```
[holistic: eligibility + summary + approach-eval]   (you, strong model, inline)
        │  writes HOLISTIC.md (shared framing for every lens)
        ▼
[gate: which lenses apply?]   (by what the diff touches)
        ▼
[correctness] [quality]              (parallel sub-agents, sonnet)
[security]                           (parallel sub-agent, default/strong model — reads beyond the diff)
[tests]                              (parallel sub-agent, sonnet — only if tests changed)
        │  each writes LENS_<name>.md
        ▼
[gate: which findings need verification?]   (you — only findings the lens flagged "Needs verification")
        ▼
[verify finding batches]             (parallel sub-agents — resolve the flagged uncertainty against the real code)
        │  each writes VERDICT_<batch>.md
        ▼
[merge: drop refuted → confidence-score → filter → dedupe → severity]   (you, inline)
        ▼
./tmp/review-changes.md
```

The node instructions for each phase live in this skill's `nodes/` directory. When spawning a lens sub-agent, point it at the matching node file.

## Orchestrator Rules

You (the main session):
- **Run the holistic phase inline** — it needs the whole picture and produces the shared framing every lens depends on. Keep it on the session's default (strong) model.
- **Spawn lens sub-agents in parallel** (a single message with multiple `Agent` calls) so they run concurrently.
- **Spawn verifier sub-agents** only for findings a lens flagged `Needs verification: yes` — they resolve the flagged uncertainty against the real code. Findings the lens confirmed itself are trusted and skip this step.
- **Merge inline** — apply the verdicts, then collect every `LENS_*.md`, score, filter, dedupe, and write the final report yourself.

You MUST NOT:
- Output the raw git diff or command output to the user
- Comment on code outside the diff (lenses are told this too — enforce it at merge)

## Model Selection (cost lever)

The `Agent` tool accepts a per-call `model` parameter (`"haiku" | "sonnet" | "opus"`).
- **correctness, quality, tests** → `model: "sonnet"` — focused, mostly mechanical lens work.
- **security** → omit `model` (use the session default / strongest available). Cheap security review gives false confidence; this is the one lens not to discount. It also needs to trace data flow *across* files, not just read the diff.
- **verifiers** → `model: "sonnet"` by default, but **omit `model` for any batch containing a security finding** — verifying a security claim cheaply gives the same false confidence as reviewing it cheaply.

## Workspace

All intermediates live in `./tmp/review-changes/` (create it; it can be deleted after). The final report is written to `./tmp/review-changes.md` (one level up) so the caller and user have a stable path.

- `./tmp/review-changes/HOLISTIC.md` — summary + approach evaluation (written by you in Phase 1)
- `./tmp/review-changes/LENS_correctness.md`, `LENS_security.md`, `LENS_quality.md`, `LENS_tests.md` — per-lens findings
- `./tmp/review-changes/VERDICT_<batch>.md` — per-batch verification verdicts (written by verifier sub-agents in Phase 4)

---

## Phase 1: Holistic (inline, strong model)

Read `nodes/node-holistic.md` and execute it yourself. This covers:
- **Eligibility check** — empty/trivial diff → say so and stop, or fall back to a single inline review (skip the fan-out). Only fan out when the diff is non-trivial.
- **Changes summary** and **approach evaluation** (root cause vs symptom, right layer, simpler alternatives, trade-offs).

Write the result to `./tmp/review-changes/HOLISTIC.md`. This file is passed to every lens as shared context.

**Gate:** if the eligibility check stops the review, do not proceed to Phase 2.

---

## Phase 2: Lens Applicability Gate

Decide which lenses to run based on what the diff touches. Do NOT always spawn all four.

- **correctness** — always
- **quality** — always
- **security** — always (data-handling, auth, input, network, deserialization, secrets all warrant it)
- **tests** — only if the diff adds or modifies test files

State which lenses you're running and why before spawning.

---

## Phase 3: Lenses (parallel sub-agents)

Spawn all applicable lenses in **a single message** so they run in parallel. For each:

```
Agent(
  description: "[lens] review",
  model: "sonnet",   // OMIT for the security lens
  prompt: "Read the instructions in [this skill's directory]/nodes/node-lens-[name].md
    and the shared rules in [this skill's directory]/nodes/lens-common.md, then execute them.
    Read ./tmp/review-changes/HOLISTIC.md for shared framing (intended approach, constraints, root cause).
    Review ONLY the changes in the current diff. Write findings to ./tmp/review-changes/LENS_[name].md.
    Report back: number of findings and the highest severity."
)
```

---

## Phase 4: Verification (parallel sub-agents)

Lenses are **trusted by default** — a finding is settled unless its author flagged that it rests on something they couldn't confirm. Only those flagged findings get a verification pass; spawn verifier sub-agents to resolve them against the real code.

**4a. Triage — which findings need verification?**

Read every `./tmp/review-changes/LENS_*.md` and collect the findings. Then decide what to verify:

- **Verify** only findings marked **`Needs verification: yes`** — the lens itself signalled it couldn't confirm them from the diff alone (behavior outside the diff, a caller's actual input, a runtime assumption, a guard that may exist elsewhere).
- **Trust** every finding marked `Needs verification: no` — carry it straight to the merge. Do NOT spawn a verifier for it.
- If **no finding is flagged**, skip verification entirely and go to Phase 5.

State which findings you're sending to verification and why before spawning.

**4b. Spawn verifiers (batched, parallel).**

Group findings into batches of **2-4 by shared file/module** so each verifier reads the surrounding code once. Spawn all batches in **a single message** so they run in parallel:

```
Agent(
  description: "verify findings [files]",
  model: "sonnet",   // OMIT for any batch containing a security finding
  prompt: "Read the instructions in [this skill's directory]/nodes/node-verify.md and execute them.
    Read ./tmp/review-changes/HOLISTIC.md for shared framing.
    Verify these findings — resolve each one's flagged uncertainty against the real code: [paste each finding's lens, file:line, severity, description, and its 'Needs verification' note].
    Write verdicts to ./tmp/review-changes/VERDICT_[batch].md.
    Report back: counts of CONFIRMED / REFUTED / UNCERTAIN."
)
```

---

## Phase 5: Merge (inline)

After the verifiers return, read every `./tmp/review-changes/VERDICT_*.md` and `./tmp/review-changes/LENS_*.md`, then produce the final report.

**5a. Apply verdicts (only for findings that went through verification).**
- **REFUTED** → drop the finding.
- **CONFIRMED** → keep it, using the verifier's adjusted severity and evidence.
- **UNCERTAIN** → keep as a candidate but score it conservatively in 5b; it will usually fall below the filter unless you can independently justify it. Mark it "(unverified)" in the report if it survives.
- **Trusted findings** (those never flagged for verification) → carry through to scoring as-is.

**5b. Confidence score.** Score each surviving finding 0–100 for how likely it is a real, in-scope issue. Use this rubric:

- **0–25** — false positive under light scrutiny, or a pre-existing issue on lines the diff didn't touch
- **26–50** — might be real but unverified, or a stylistic nit not called out in project conventions
- **51–75** — verified real, but low-impact / infrequent / minor relative to the change
- **76–90** — important; double-checked and likely to bite in practice
- **91–100** — certain; directly confirmed, will happen frequently

**5c. Filter.** Drop everything scoring **< 80**. If nothing remains, say the changes look good. Attach the score to each surfaced finding.

**5d. Dedupe.** When two lenses flag the same file + line + root issue, keep one entry at the **highest** severity and note both lenses.

**5e. Normalize severity** to MUST FIX / SHOULD FIX / NIT (definitions below).

**False positives to drop (give these to lenses too):**
- Pre-existing issues, or issues on lines the diff did not modify
- Anything a linter / typechecker / compiler would catch (imports, types, formatting) — assume CI runs these
- Pedantic nitpicks a senior engineer wouldn't raise
- Changes that are clearly intentional and part of the broader change

Do NOT run the build or typecheck — that is CI's job.

---

## Output Report

Write the complete review to `./tmp/review-changes.md` before finishing, in this format:

```markdown
## Summary

[Brief overview of what changed and overall risk level — from HOLISTIC.md]

## Findings

### [Issue Title]
- **Severity**: MUST FIX / SHOULD FIX / NIT
- **Confidence**: [80–100]
- **Verified**: confirmed (went through verification) / trusted (lens confirmed it, no check needed) / unverified (UNCERTAIN after a check)
- **Lens**: [correctness / security / quality / tests]
- **Description**: [What's wrong]
- **Failure mode**: [Concrete trigger → behavior → harm, OR "No distinct failure mode — <maintainability/readability> concern". Never a vague restatement.]
- **Why it matters**: [Impact/risk — the magnitude, given the failure mode above]
- **Suggested fix**: [Concrete, actionable; code snippet only if helpful]

## Positive Notes

[Good practices worth calling out]

## Recommendation

✅ Safe to merge / ⚠️ Merge with comments / ❌ Needs changes before merge
```

## Severity Definitions

- **MUST FIX**: Critical — could cause bugs, security vulnerabilities, or data loss
- **SHOULD FIX**: Important for maintainability, performance, or best practices
- **NIT**: Minor style/consistency (only mention if worth noting)

## Related Skills

- `@test-quality-reviewer` — Detailed test quality analysis using 4 Pillars framework (the tests lens may defer to it)
- `@code-refactoring` — Structured refactoring suggestions
- `@commit-plan` — Organize reviewed changes into semantic commits
