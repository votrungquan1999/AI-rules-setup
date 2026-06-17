---
name: review-changes
description: Senior engineer code review analyzing diffs for correctness, security, edge cases, and best practices with severity-based findings. Use when reviewing code, checking changes, or when user says "review my changes", "code review", "review this diff", or "check my code".
context: fork
---

# Review Changes

You are the **orchestrator** for an autonomous code review. You run a holistic pass yourself, fan out specialized review lenses as parallel sub-agents, then merge their findings into a single severity-ranked report.

This skill is a lightweight **fan-out → merge** pipeline — NOT a heavy stateful workflow. There are no per-phase user gates; spawn, collect, merge, done.

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
[merge: confidence-score → filter → dedupe → severity]   (you, inline)
        ▼
./tmp/review-changes.md
```

The node instructions for each phase live in this skill's `nodes/` directory. When spawning a lens sub-agent, point it at the matching node file.

## Orchestrator Rules

You (the main session):
- **Run the holistic phase inline** — it needs the whole picture and produces the shared framing every lens depends on. Keep it on the session's default (strong) model.
- **Spawn lens sub-agents in parallel** (a single message with multiple `Agent` calls) so they run concurrently.
- **Merge inline** — collect every `LENS_*.md`, score, filter, dedupe, and write the final report yourself.

You MUST NOT:
- Output the raw git diff or command output to the user
- Comment on code outside the diff (lenses are told this too — enforce it at merge)

## Model Selection (cost lever)

The `Agent` tool accepts a per-call `model` parameter (`"haiku" | "sonnet" | "opus"`).
- **correctness, quality, tests** → `model: "sonnet"` — focused, mostly mechanical lens work.
- **security** → omit `model` (use the session default / strongest available). Cheap security review gives false confidence; this is the one lens not to discount. It also needs to trace data flow *across* files, not just read the diff.

## Workspace

All intermediates live in `./tmp/review-changes/` (create it; it can be deleted after). The final report is written to `./tmp/review-changes.md` (one level up) so the caller and user have a stable path.

- `./tmp/review-changes/HOLISTIC.md` — summary + approach evaluation (written by you in Phase 1)
- `./tmp/review-changes/LENS_correctness.md`, `LENS_security.md`, `LENS_quality.md`, `LENS_tests.md` — per-lens findings

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

## Phase 4: Merge (inline)

After all lenses return, read every `./tmp/review-changes/LENS_*.md` and produce the final report.

**4a. Confidence score.** Score each finding 0–100 for how likely it is a real, in-scope issue. Use this rubric:

- **0–25** — false positive under light scrutiny, or a pre-existing issue on lines the diff didn't touch
- **26–50** — might be real but unverified, or a stylistic nit not called out in project conventions
- **51–75** — verified real, but low-impact / infrequent / minor relative to the change
- **76–90** — important; double-checked and likely to bite in practice
- **91–100** — certain; directly confirmed, will happen frequently

**4b. Filter.** Drop everything scoring **< 80**. If nothing remains, say the changes look good. Attach the score to each surfaced finding.

**4c. Dedupe.** When two lenses flag the same file + line + root issue, keep one entry at the **highest** severity and note both lenses.

**4d. Normalize severity** to MUST FIX / SHOULD FIX / NIT (definitions below).

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
- **Lens**: [correctness / security / quality / tests]
- **Description**: [What's wrong]
- **Why it matters**: [Impact/risk]
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
