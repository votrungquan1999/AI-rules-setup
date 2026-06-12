# Node: Validation

Post-implementation validation of each plan step. Runs sequentially — one step at a time — with full plan and implementation context.

## Input

- Read the `implementation-plan.md` artifact for the **full plan**
- Read the `plan-steps.md` artifact for step statuses
- Read the latest `step-result.md` and all `investigation-step-[N].md` artifacts for implementation details
- Read `loop-state.json` for validation progress

## Execution

### For Each Completed Step

Validate every completed step sequentially. For each step N:

#### 1. Verify Implementation Matches Plan

Read the files changed for this step (listed in the step result):
- Does the implementation actually deliver the planned behavior?
- Are there deviations from the plan that weren't documented?
- Was the technical approach from the plan followed?

#### 2. Verify Test Coverage

Find and read the test(s) written for this step:
- Does the test actually assert the planned behavior?
- Run the test in isolation — does it pass?
- Is the test testing the right thing (not just passing by coincidence)?
- Could the test pass even if the implementation were wrong (false positive)?

#### 3. Check for Regressions Against Other Steps

- Read the implementation of adjacent steps (those that touch shared files)
- Are there conflicts introduced by this step's changes?
- Did this step accidentally overwrite or break another step's work?

#### 4. Run Related Tests

Run tests related to this step's affected area:
- The step's own test(s)
- Tests for features that share the same files
- Report any failures

#### 5. Check Code Quality

Quick review of the implementation:
- Does it follow the codebase's existing patterns?
- Any obvious bugs, missing error handling at system boundaries, or type issues?
- Any leftover debug code or TODOs?

#### 6. Write Step Findings

Write findings to the `validation-step-[N].md` artifact:

```markdown
# Validation: Step [N] — [behavior description]

## Implementation vs Plan
- **Matches plan**: yes | partial | no
- **Deviations**: [list, or "none"]

## Test Coverage
- **Test file**: [path]
- **Assertions valid**: yes | no — [details]
- **Test passes**: yes | no
- **False positive risk**: low | medium | high — [why]

## Cross-Step Consistency
- **Shared files checked**: [list]
- **Conflicts with other steps**: [list, or "none"]

## Test Results
- **Step test**: ✅ pass | ❌ fail
- **Related tests**: ✅ all pass | ❌ [failures]

## Issues Found
- [Issue description and severity, or "None"]

## Verdict
- **Step valid**: yes | yes with caveats | no
- **Action needed**: none | [specific fix required]
```

Update `loop-state.json`: increment `validation_step`.

### After All Steps Validated

Write a consolidated `validation-summary.md` artifact:

```markdown
# Validation Summary

## Steps Validated: [count]

## Valid Steps: [list]
## Steps With Caveats: [list with brief reason]
## Invalid Steps: [list with required fix]

## All Issues Found
- [Issue 1 — severity]
- [Issue 2 — severity]
...

## Overall Verdict
- **All steps valid**: yes | no
- **Fixes required before summary**: [list, or "none"]
```

## Output

Report back to the orchestrator:
- How many steps passed validation
- Any steps that are invalid and need fixes
- Whether the feature is ready for the summary phase
