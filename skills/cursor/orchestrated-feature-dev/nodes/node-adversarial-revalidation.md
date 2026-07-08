# Node: Adversarial Revalidation

Check the **actual implemented code** against the frozen behavior-risk catalog. Runs in Phase 5b, parallel with conformance validation (5a). Process assigned risk entries ONE AT A TIME.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## What makes this different from conformance validation

Conformance (5a) asks "did each step match the plan?" — it trusts the plan as the spec. You do the opposite: take the frozen `<ws>/BEHAVIOR_RISKS.md` as the source of truth for *expected* behavior on paths the plan never specified, and probe whether the real code survives them. The catalog is frozen and implementation-blind by construction (written before the code existed) — treat it as ground truth. **Never edit it**, not even a wrong-looking entry; flag it in your finding and let the orchestrator judge.

## Input

- Your assigned entries from `<ws>/BEHAVIOR_RISKS.md` (the risk ids in your prompt) — read only those plus anything they cross-reference.
- The **actual implemented code** for the paths those risks touch (from `<ws>/IMPLEMENTATION_PROGRESS.md` file lists + the plan).

## Workflow

For EACH assigned risk, one at a time:

1. **Locate the path** in the real code — where the catalogued situation would be handled, or where the code assumes it can't happen.
2. **Determine actual behavior.** Reason through what the code does when the situation arises; where reasoning isn't conclusive, write a **scratch probe** (throwaway test/script) to observe the real behavior — the probe confirms behavior, the catalog stays the source of truth for what behavior *should* be.
3. **Compare to expected** — for a requirement-implied entry, against the catalog's expected behavior; for a silent-but-since-resolved entry, against the resolution the orchestrator folded into the plan.
4. **Classify:** survives | breaks (crash/error/clearly wrong) | silent-misbehavior (no error, but wrong/lossy/inconsistent — the dangerous class) | unclear.
5. **Severity** for anything not `survives`: low | medium | high (impact × likelihood of the situation).

Do NOT fix anything — this node reports; the orchestrator triages fixes with the user.

## Output

Append each finding to `<ws>/ADVERSARIAL_REVALIDATION.md` (one section per risk):

```markdown
# Adversarial Revalidation

## R[id] — [behavior-risk title]
- Expected (frozen catalog): [expected behavior]
- Actual behavior: [what the code does]
- How observed: reasoning | scratch probe ([what the probe did])
- Verdict: survives | breaks | silent-misbehavior | unclear
- Severity: low | medium | high | n/a (survives)
- Where: [file:line]
- Note: [anything the orchestrator needs — incl. "catalog entry looks wrong because…" if so]
```

Report back to the orchestrator: per-risk verdicts with severity, and a count of non-`survives` findings.
