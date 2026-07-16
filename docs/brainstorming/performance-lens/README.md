# Brainstorm: Performance Review Lens for `review-changes`

## Problem statement

The `review-changes` skill reviews a diff through four lenses — correctness, quality, security, tests — in a `holistic → gate → lenses → verify → merge` pipeline. Performance today is only **shallowly and inconsistently** covered: a single bullet inside the correctness lens (`node-lens-correctness.md` focus #3) plus scattered mentions in the SHOULD-FIX severity definitions. There is no dedicated pass that reasons about *magnitude* — the thing that separates a real performance regression from premature-optimization noise.

We want a **dedicated performance lens** that owns performance findings, runs only when the change is actually performance-sensitive, reasons about magnitude before flagging, and behaves consistently across all three agent variants of the skill.

## Current state (what exists)

The skill ships in three diverging variants under `skills/`:

- **claude-code** — richest: thin orchestrator + 8 node files, lenses run as parallel subagents, dedicated `node-merge.md`.
- **cursor** — same fan-out but the merge is done **inline** (no merge node).
- **antigravity** — **monolithic**: one agent walks every lens sequentially, inline, no node files.

No `manifest.json` exists under `skills/`, so there is nothing to register there — nodes are wired purely by references inside `SKILL.md`.

## Locked decisions (from clarifying Q&A)

1. **Carve performance out of correctness.** The new lens is the sole owner. Correctness stops claiming performance (its focus #3 is removed). "Performance" stays inside the shared SHOULD-FIX severity vocabulary — that is severity language, not lens ownership.
2. **Conditional gate — perf-sensitive.** The performance lens is not "always on". The holistic pass emits a `Perf-sensitive: yes/no` signal; the orchestrator runs the lens only when `yes`. This mirrors the conditional `tests` lens, but the signal is **semantic** (assessed by holistic) rather than filename-based, because the orchestrator never reads the diff itself.
3. **All three variants.** claude-code + cursor (node-based) + antigravity (fold into its monolithic `SKILL.md`), kept behaviorally aligned.
4. **This session's deliverable = design + plan, then pause.** No implementation until approved.

## Documents in this brainstorm

- [edge-cases.md](edge-cases.md) — the traps a performance lens must survive (premature optimization, magnitude, runtime-handled patterns, removed optimizations, DoS overlap).
- [node-design.md](node-design.md) — the actual design: gate signal, focus categories, techniques the agent uses, the perf-tuned severity rubric, what-not-to-flag, model selection, and the per-variant wiring changes.
- [plan.md](plan.md) — the incremental implementation plan (steps, acceptance criteria, validation approach, risks).

## Widest-view framing (zoom-out)

A code-review lens is a **classifier under uncertainty**: it sees a static diff and must predict runtime behavior it cannot measure. For performance that uncertainty is sharpest — the same line is a critical bug or a non-issue depending on `n` and call-frequency, neither of which the diff shows. So the lens's whole design centers on one discipline: **establish magnitude before flagging, and admit when magnitude is unmeasurable** rather than fabricating false precision. Everything in [node-design.md](node-design.md) flows from that single principle.
