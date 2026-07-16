# Implementation plan: performance lens

Back to [README](README.md) · Design in [node-design.md](node-design.md).

## Validation approach (read first)

These are **markdown skill/prompt files** — there is no automated test harness for prose, and the meta-rules forbid requiring a build/server run to validate. So each step's "test" is a **dry-run + parity review**, not a red-green unit test:

- **Dry-run** — walk the changed instruction against 2 fixture diffs by hand: one clearly perf-sensitive (a query inside a loop) and one clearly not (docs-only). Confirm the instruction produces the intended routing/classification.
- **Parity review** — for a rubric/classification step, feed it a real MUST-FIX case (N+1 on a hot list render) and a premature-opt NIT case, and confirm the rubric sorts them correctly.
- **Consistency review** — grep every reference to the new node/gate resolves, and the three variants agree on gate + focus + rubric + magnitude discipline.

## Steps

### Step 1 — Author the performance node (claude-code)

**AC:** `nodes/node-lens-performance.md` exists, reads `lens-common.md` + `HOLISTIC.md` first, and covers the six focus categories, the cross-file magnitude license, the agent techniques, the perf-tuned severity rubric, and the perf-specific what-not-to-flag — output in the standard `lens-common` finding format.
**Validation:** dry-run classify two fixture findings (real N+1 MUST-FIX vs premature-opt NIT) and confirm the rubric sorts them correctly.

### Step 2 — Add the perf-sensitivity gate signal to holistic (claude-code)

**AC:** `node-holistic.md` assesses perf-sensitivity and emits `Perf-sensitive: yes/no — reason` in both `HOLISTIC.md` and its report-back to the orchestrator.
**Depends on:** none (independent of Step 1).
**Validation:** dry-run on a loop+query fixture → `yes`; on a docs-only fixture → `no`.

### Step 3 — Wire the gate + lens into the orchestrator (claude-code `SKILL.md`)

**AC:** Pipeline/gate lists performance and runs it **only when holistic flagged perf-sensitive**; Phase 2 gate text updated; Phase 3/4 reference it; Model Selection lists performance = `sonnet`.
**Depends on:** Steps 1 + 2.
**Validation:** consistency review — every reference resolves; the gate condition matches holistic's signal name exactly.

### Step 4 — Carve performance out of correctness + touch verify (claude-code)

**AC:** `node-lens-correctness.md` focus #3 removed; `node-verify.md` has the magnitude-verification line; grep confirms no dangling perf ownership left in correctness and nothing silently drops perf coverage.
**Depends on:** Step 1 (the node must exist before correctness stops owning perf).
**Validation:** consistency review of the carve-out.

**→ Checkpoint after Step 4** (per meta-rules multi-shot: ~5 files touched). Pause for user review of the claude-code variant before porting.

### Step 5 — Port to the cursor variant

**AC:** cursor gets the perf node, the holistic signal, the correctness carve-out, the verify touch, and the `SKILL.md` gate/model wiring — behaviorally identical, adapted to cursor's inline-merge structure.
**Depends on:** Steps 1–4 approved.
**Validation:** parity review vs claude-code.

### Step 6 — Fold into the antigravity monolith

**AC:** the single `SKILL.md` gains a gated Performance lens section, perf-sensitivity in its holistic step, and perf removed from its correctness section — same gate/rubric/discipline.
**Depends on:** Steps 1–4 approved.
**Validation:** parity review vs claude-code.

### Step 7 — Cross-variant parity + final dry-run

**AC:** all three variants agree on gate condition, focus categories, severity rubric, and magnitude discipline; a shared perf-sensitive fixture diff would be handled the same way in each.
**Depends on:** Steps 5 + 6.
**Validation:** side-by-side parity checklist across the three `SKILL.md` + node sets.

## Risks & open items

- **Model choice (Step 3).** `sonnet` recommended; the magnitude reasoning + cross-file tracing is the hard part, so this is the one call worth revisiting if perf is high-stakes in the target stacks. Low cost to change later.
- **Gate false-negatives.** A subtly-hot path holistic marks `no` never gets the lens. Mitigation = bias holistic toward `yes` under genuine uncertainty, accepting a little of the cost the gate was meant to save. Tunable in Step 2.
- **No automated harness.** Validation is dry-run + parity review by construction (skill prose). Honest limitation, not a gap to fix here.
- **No manifest to update.** Confirmed no `manifest.json` under `skills/`; nodes are wired by `SKILL.md` references only.
