# Node: Quality Gate

Periodic quality check that reviews recent tests and implementation for issues.

## Input

Read the `loop-state.json` artifact for the current behavior counter.
Read the `plan-steps.md` artifact to identify which behaviors were completed since the last quality check.

## Execution

### 1. Test Quality Review

Use `@test-quality-reviewer` to review the tests written in the most recent 2-3 behaviors.

Focus on:
- Are tests reliable (no flakiness)?
- Are assertions valid (actually proving correctness)?
- Are tests sensitive (would catch real bugs)? **Answer this by reading the assertion, not by injecting a defect.**

**No mutation testing in this gate.** Do not edit source to see whether a test goes red, and do not build a mutation harness. That pass runs once, in Phase 5c; doing it per gate re-mutates the same files 3-5 times a run, and one gate that did it spent 62 of its 68 minutes on 96 mutants. Suspect a hollow test? Report it and let 5c settle it.

### 2. Code Refactoring Review

Use `@code-refactoring` to review the implementation from recent behaviors.

Focus on:
- Any duplication introduced across recent behaviors?
- Naming clarity?
- Unnecessary complexity?

**If `@code-refactoring` reports missing test coverage → skip the refactoring review** rather than blocking. The tests exist from the BDD loop.

### 3. Comment Review

Review the comments the recent behaviors added or changed, tests included. Read each touched file's diff with wide context (e.g. `-U20`) so every comment is judged next to the code it describes; a pre-existing comment in that window is in scope only if the change made it wrong.

1. Read the comment rules in the project's rules (`.agents/rules/`) and the comment defaults in `nodes/node-bdd-step.md` step 6.
2. For each comment, ask: **would a dev who never saw the old code, the diff, the plan or this session understand it?** Then check it against each rule.
3. For every comment that fails, write the fix — the replacement text, or "delete". When a reason is buried in history wording, restate it as a fact about the code as it is rather than dropping it: "the old per-user subqueries re-scanned the table ~5k times" becomes "one join, not a subquery per user — those re-scan the table per row".

Never skip this when step 2 is skipped; the author's own check is the only other one these comments get.

### 4. Apply Fixes

If issues are found:
1. Fix them immediately
2. Run all tests to confirm nothing broke
3. Note what was fixed
4. **Fold each fix into the behavior that owns it** — read `commit-plan.md`; if `Strategy: defer`, run no git commands. Under `per-behavior`, a refactor or test fix touching already-committed behavior code belongs in that behavior's commit, not a new one — follow the fold procedure in `nodes/commit-protocol.md`. A fix spanning several behaviors folds into each owning commit separately. If the owning commit is already pushed, or a rebase conflicts, **stop and hand it back to the orchestrator** rather than forcing it.

## Output

Write to the `quality-result.md` artifact:

```markdown
# Quality Gate Result

## Checkpoint: After behaviors [X-Y]

## Test Quality
- **Score**: [Excellent / Good / Needs Improvement]
- **Issues Found**: [count]
- **Issues Fixed**: [count]
- **Details**: [brief list]

## Code Quality
- **Refactoring Applied**: [yes/no]
- **Changes Made**: [brief list, or "none needed"]
- **Comments Fixed**: [count + brief list, or "none"]

## Overall
- **Quality**: pass | needs-fixes
- **Notes**: [anything the orchestrator needs to know]
```

Update `loop-state.json` artifact: increment `quality_checks`.
