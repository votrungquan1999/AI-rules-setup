# Node: Quality Gate

Periodic quality check that reviews recent tests and implementation for issues.

## Input

Read the `loop-state.json` artifact for the current step counter.
Read the `plan-steps.md` artifact to identify which steps were completed since the last quality check.

## Execution

### 1. Test Quality Review

Use `@test-quality-reviewer` to review the tests written in the most recent 2-3 steps.

Focus on:
- Are tests reliable (no flakiness)?
- Are assertions valid (actually proving correctness)?
- Are tests sensitive (would catch real bugs)? **Answer this by reading the assertion, not by injecting a defect.**

**No mutation testing in this gate.** Do not edit source to see whether a test goes red, and do not build a mutation harness. That pass runs once, in Phase 5c; doing it per gate re-mutates the same files 3-5 times a run, and one gate that did it spent 62 of its 68 minutes on 96 mutants. Suspect a hollow test? Report it and let 5c settle it.

### 2. Code Refactoring Review

Use `@code-refactoring` to review the implementation from recent steps.

Focus on:
- Any duplication introduced across recent steps?
- Naming clarity?
- Unnecessary complexity?

**If `@code-refactoring` reports missing test coverage → skip the refactoring review** rather than blocking. The tests exist from the BDD scenario steps.

### 3. Apply Fixes

If issues are found:
1. Fix them immediately
2. Run all tests to confirm nothing broke
3. Note what was fixed
4. **Fold each fix into the behavior that owns it** — read `commit-plan.md`; if `Strategy: defer`, run no git commands. Under `per-behavior`, a refactor or test fix touching already-committed behavior code belongs in that behavior's commit, not a new one — follow the fold procedure in `nodes/commit-protocol.md`. A fix spanning several behaviors folds into each owning commit separately. If the owning commit is already pushed, or a rebase conflicts, **stop and hand it back to the orchestrator** rather than forcing it.

## Output

Write to the `quality-result.md` artifact:

```markdown
# Quality Gate Result

## Checkpoint: After steps [X-Y]

## Test Quality
- **Score**: [Excellent / Good / Needs Improvement]
- **Issues Found**: [count]
- **Issues Fixed**: [count]
- **Details**: [brief list]

## Code Quality
- **Refactoring Applied**: [yes/no]
- **Changes Made**: [brief list, or "none needed"]

## Overall
- **Quality**: pass | needs-fixes
- **Notes**: [anything the orchestrator needs to know]
```

Update `loop-state.json` artifact: increment `quality_checks`.
