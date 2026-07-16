# Edge cases the performance lens must survive

Back to [README](README.md) · Design in [node-design.md](node-design.md).

These are the ways a naive performance lens loses a senior engineer's trust or misses real regressions. Each maps to a concrete rule in [node-design.md](node-design.md).

## False-positive traps (the lens must NOT flag these)

- **Premature optimization on cold paths.** Micro-optimizing startup, one-time init, migrations, admin/CLI scripts, or build-time code. These run once and off the hot path — optimizing them is noise. *→ hot-path tracing + what-not-to-flag.*
- **Bounded-small `n`.** A loop over a fixed 3-element config, or a list whose size is provably capped. `O(n²)` over `n ≤ 5` is fine. *→ magnitude-first discipline.*
- **Runtime/DB/compiler already handles it.** The DB query planner, V8 hidden classes, JIT, Python C-builtins, string interning. Flagging "naive" patterns the platform already optimizes is wrong. *→ runtime-awareness guard.*
- **Readability-costing micro-opts.** Rewriting clear code into a cryptic one-liner for a constant-factor win with no magnitude behind it. Senior engineers reject these. *→ severity rubric drops these to NIT/nothing.*
- **False precision.** Asserting "this is 10× slower" from a static read the agent never benchmarked. *→ static-only humility / measure-to-confirm.*

## Correctness/scope traps

- **Removed optimization is also a regression.** The diff *deleting* a memo, index, cache, batch, `LIMIT`, or pagination degrades performance just as much as adding an inefficiency. A lens that only looks for "added slow code" misses half its job. *→ focus category "regression by removal".*
- **Magnitude lives outside the diff.** Whether a path is hot, and how big `n` really is, usually isn't visible in the changed lines. The lens needs the security-style license to read callers/callees to establish magnitude — but the *finding* must still concern diff'd (or diff-exposed) code. *→ cross-file magnitude license.*
- **Diff-only scope still applies.** Pre-existing slowness on lines the diff didn't touch is out of scope (inherited from `lens-common`). The lens reads beyond the diff only to size the impact of a *changed* path, not to hunt unrelated hotspots.

## Cross-lens ownership traps

- **Perf that is a security DoS.** ReDoS, zip-bombs, algorithmic-complexity attacks, unbounded request-driven allocation. These are dual-owned: performance flags the perf angle and notes "also attacker-triggerable → security/DoS"; the security lens keeps its own coverage. Both flagging the same line is fine — merge dedupes by `file:line` to the highest severity. *→ ownership rules in node-design.*
- **Perf suggestion that breaks correctness.** Recommending a cache/memo introduces staleness; recommending eager→lazy changes ordering. This is "2+ defensible behaviors" territory — the lens must *name the correctness cost* alongside the perf win, not silently prescribe the faster-but-riskier path.

## Gate traps (conditional-run)

- **False negative on a subtly-hot path.** If holistic marks a change as not perf-sensitive but it actually sits on a hot path, the lens never runs and the regression ships. Mitigation: bias holistic toward `yes` when genuinely uncertain — but that erodes the cost savings the gate exists for. This tradeoff is called out in [plan.md](plan.md) risks.
- **Trivial-diff short-circuit.** Holistic's `single-inline-pass` path already skips *all* lenses for trivial diffs; performance inherits that correctly (a 3-line trivial change needs no perf pass).
- **Test-only / type-only / docs-only diffs.** Not perf-sensitive by construction — the gate should return `no`.
