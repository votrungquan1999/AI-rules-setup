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

## Phases

1. **Holistic (inline).** Run `node-holistic.md`: eligibility (empty/trivial diff -> say so and stop, or do a single inline pass and skip the fan-out), changes summary, approach evaluation. Write `HOLISTIC.md`. **Gate:** if eligibility stops the review, stop.
2. **Lens gate.** Always run correctness, quality, security; run tests only if the diff adds/modifies test files. State which lenses and why before spawning.
3. **Lenses (parallel subagents).** Each reads its node file + `lens-common.md` + `HOLISTIC.md`, reviews ONLY the diff, writes `LENS_<name>.md`, and reports finding count + highest severity.
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
