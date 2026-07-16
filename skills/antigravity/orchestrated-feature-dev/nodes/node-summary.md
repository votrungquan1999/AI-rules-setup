# Node: Summary

Generate a final summary of the entire orchestrated workflow execution.

## Input

Read all workflow state artifacts from the brain directory:
- `research-output.md`
- `plan-steps.md`
- `loop-state.json`
- `quality-result.md` (if exists)
- `step-result.md` (latest)
- `decisions.md` (if exists — the decision log)

## Execution

1. **Count completed steps** from `plan-steps.md` (all with status `done`)
2. **Gather quality gate results** from all quality checkpoints
3. **List all files changed** across all steps
4. **Aggregate test/lint status** from what the run already recorded — each BDD step ran its own tests test-first and the quality gates re-ran the recent steps' tests, so the suite is already green. Do **not** re-run the whole project's test suite or lint the whole project here; it's slow and redundant. Only if a state file flags an unresolved failure, note it (and at most re-run that one step's tests).

## Output

Present to the user:

```markdown
# Feature Development Complete

## Summary
[One-paragraph description of what was built]

## Steps Completed: [X/Y]
| Step | Behavior | Result |
|------|----------|--------|
| 1 | [behavior] | ✅ done |
| 2 | [behavior] | ✅ done (already covered) |
| ... | ... | ... |

## Quality Gates: [X] checkpoints passed
- Checkpoint 1 (after steps 1-3): [pass/fixed N issues]
- Checkpoint 2 (after steps 4-6): [pass/fixed N issues]

## Key Decisions
[From `decisions.md` — each point where 2+ viable options existed and one was chosen. Omit this section only if the decision log is empty.]
- [choice]: chose [option] over [alternative(s)] — [why]

## Test/Lint Status
- [From per-step results + quality gates — e.g. "all step tests green; lint clean per last quality gate". Flag any unresolved failure a state file recorded.]

## Files Changed
- [file1]: [brief description]
- [file2]: [brief description]

## Notes
- [Any caveats, follow-ups, or things to watch out for]
```

No cleanup needed — artifacts are managed by the Antigravity platform and persist with the conversation.
