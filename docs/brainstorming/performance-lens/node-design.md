# Design: the performance lens

Back to [README](README.md) · Traps in [edge-cases.md](edge-cases.md) · Steps in [plan.md](plan.md).

## 1. The gate signal (how the conditional run works)

The orchestrator never reads the diff, so it can't decide perf-sensitivity itself. The **holistic** pass does, and emits a signal the orchestrator gates on.

- `node-holistic.md` gains a short **perf-sensitivity assessment** and writes one line into `HOLISTIC.md` and its report-back: `Perf-sensitive: yes/no — <one-line reason>`.
- The orchestrator's lens gate runs the performance lens **only when `yes`** (alongside the always-on correctness/quality/security and the test-file-conditional tests lens).

**Holistic answers `yes` when the diff touches any of:**

- New or changed loops — especially nested, or iterating over collections whose size isn't provably small.
- Data access / I/O — DB or ORM queries, network calls, filesystem, cache calls — *especially any inside a loop* (N+1 shape).
- Data-structure or algorithm choice on non-trivial `n` — sorting, searching, dedup, repeated linear scans, recursion, regex over user-controlled input.
- Hot paths — request handlers, middleware, serializers, render paths, event-loop callbacks, anything per-item/per-request/per-render.
- Memory — accumulation into unbounded collections, large copies where a view/stream/reference would do, listeners/timers/subscriptions.
- **Removal** of an existing optimization — memo, index, cache, batch, `LIMIT`, pagination, virtualization.
- Frontend — component render frequency, effect/memo dependencies, large un-virtualized lists, heavy synchronous main-thread work, bundle-size-adding imports.

**Holistic answers `no` for:** config/docs/copy-only, type-only, test-only, and one-time cold-path scripts/migrations with bounded input.

## 2. Focus categories (stack-agnostic)

`node-lens-performance.md` reads `lens-common.md` + `HOLISTIC.md` first, then reviews the diff across:

1. **Algorithmic complexity** — the complexity *delta* of the changed path; nested loops / repeated scans over unbounded `n`; accidental quadratics (e.g. `array.includes` / `.find` inside a loop); `O(n²)+` where `O(n log n)`/`O(n)` suffices.
2. **Data access & I/O** — N+1 queries, per-item network/DB calls in a loop, missing batching/pagination, chatty round-trips, synchronous/blocking I/O on a hot path, work that blocks the event loop.
3. **Memory & allocation** — unbounded growth (caches/collections that never evict), large copies where a reference/view/stream would do, allocations inside hot loops, leaks (uncleaned listeners/timers/subscriptions).
4. **Redundant / repeated work** — recomputation that could be hoisted or memoized, eager work that could be lazy, duplicate fetches, missing short-circuits.
5. **Frontend rendering** (when applicable) — unnecessary re-renders, unstable identities/deps, un-virtualized large lists, layout thrash, request waterfalls, heavy synchronous main-thread work, bundle-size regressions.
6. **Regression by removal** — the diff deletes or weakens an existing optimization (index, memo, cache, batch, `LIMIT`, pagination, virtualization).

**Cross-file magnitude license** (like the security lens): the performance lens MAY read *beyond* the diff — callers, callees, types, config — but only to establish **magnitude** (is the path hot? is `n` unbounded? is the collection capped?). The finding must still concern code the diff introduced, changed, or newly exposed.

## 3. Techniques the agent uses (the "how")

1. **Magnitude-first discipline** — every finding carries a magnitude estimate: (a) size of `n` — bounded/small vs unbounded/large; (b) heat of the path — per-request/render/item vs one-time/cold. No magnitude → NIT or dropped. This is encoded directly in the `Failure mode` field: *input scale (trigger) → extra work the code does (behavior) → latency/memory/cost at that scale (harm)*.
2. **Complexity-delta framing** — anchor to "introduced by the change": what did the path cost before vs after? A regression (`O(n)→O(n²)`, a new hot-path allocation, a dropped index) is in scope; pre-existing slowness is not.
3. **Hot-path tracing** — before asserting impact, trace where the changed code is called from and how often (Read/Grep across files). A flawless micro-opt on a cold init path is not a finding.
4. **Static-only humility / measure-to-confirm** — the agent can't benchmark a diff. When magnitude depends on runtime data it can't see (real `n`, real call frequency, real payload size), it either states the finding **conditionally** ("*if* this path is hot / `n` is large, then …") or marks `Needs verification: yes` on the magnitude assumption — never fabricated numbers.
5. **Runtime-awareness guard** — don't flag patterns the platform already optimizes (query planner, JIT, hidden classes, C-builtins). Lives in what-not-to-flag.

## 4. Perf-tuned severity rubric

- **MUST FIX** — unbounded growth / OOM; timeout or DoS on realistic input; N+1 on a hot request/list-render path at real scale; blocking the event loop under load.
- **SHOULD FIX** — real but bounded degradation; avoidable extra queries/allocations on a warm path; missing batching where `n` is moderate.
- **NIT** — micro-optimizations, constant-factor tweaks with no magnitude behind them (usually dropped by merge's `<80` confidence filter).

## 5. What NOT to flag (extends `lens-common`)

- Premature optimization on cold/one-time/startup/admin/build paths.
- Bounded-small `n` (loop over a fixed small config).
- Patterns the runtime/DB/compiler already optimizes.
- Readability-costing micro-opts with no magnitude behind them.
- Caching/memoization that trades correctness (staleness) **without** the finding acknowledging that cost — if suggested, the correctness cost must be named (2+ defensible behaviors → note it, don't prescribe).
- Measured claims the agent didn't actually measure.

## 6. Verification touch (`node-verify.md`)

Add one line: for a **performance** finding, verifying means confirming the **magnitude assumption** — that `n` is really unbounded and the path is really hot — not merely that the code compiles or the line is reachable. If magnitude can't be confirmed from the code, downgrade to **UNCERTAIN** (merge scores it conservatively and it usually falls below the filter). This keeps unmeasurable perf speculation from surviving.

## 7. Model selection

- **Recommendation: `sonnet`** for the performance lens (like correctness/quality/tests). Perf pattern-spotting is mostly mechanical; the quality comes from the magnitude discipline + the verification pass, not raw model strength.
- Verifiers default `sonnet`. (Unlike security, a cheap perf check does not carry the same catastrophic false-confidence risk.)
- This is the one genuinely arguable call — see [plan.md](plan.md) risks. Easy to bump to the strong model later if perf matters heavily in the target stacks.

## 8. Cross-lens ownership resolution

- **correctness** — remove focus #3 ("Performance regressions"). Correctness no longer owns perf.
- **security** — ReDoS / algorithmic-complexity DoS is dual-owned: performance flags the perf angle and notes the attacker-triggerable/security aspect; security keeps its own DoS coverage; merge dedupes by `file:line`.
- **quality / severity defs** — unchanged. "Performance" stays in the shared SHOULD-FIX vocabulary in `lens-common.md` and `node-merge.md` — that is severity language, not lens ownership.

## 9. Per-variant wiring changes

**claude-code** (node-based, parallel):
- NEW `nodes/node-lens-performance.md` (sections 2–6 above).
- `nodes/node-holistic.md` — add the perf-sensitivity assessment + `Perf-sensitive:` line (section 1).
- `nodes/node-lens-correctness.md` — remove focus #3.
- `nodes/node-verify.md` — add the magnitude-verification line (section 6).
- `SKILL.md` — add performance to the Pipeline lens list with the conditional gate; Phase 2 gate text; Phase 3 mention; Model Selection = `sonnet`.

**cursor** (node-based, inline merge): same node + holistic + correctness + verify edits; `SKILL.md` Pipeline lens list, gate, and model note updated. (Merge is inline — no merge node to touch.)

**antigravity** (monolithic single `SKILL.md`): fold a **gated Performance lens section** into the sequential lens walk (gate, focus categories, magnitude discipline, severity rubric, what-not-to-flag); add perf-sensitivity to the holistic step; remove perf from the correctness section.

All three must stay behaviorally aligned on: gate condition, focus categories, severity rubric, and magnitude discipline — verified by the parity check in [plan.md](plan.md).
