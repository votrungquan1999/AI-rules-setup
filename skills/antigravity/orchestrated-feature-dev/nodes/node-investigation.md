# Node: Investigation

Deep-dive investigation of each plan behavior. Runs sequentially — one behavior at a time — with full plan context throughout.

## Input

- Read the `implementation-plan.md` artifact for the **full plan** (all behaviors, technical design, architecture decisions)
- Read the `plan-steps.md` artifact for the behavior list
- Read `loop-state.json` for the current investigation progress

## Execution

### For Each Behavior in the Plan

Investigate every behavior sequentially. For each behavior N:

#### 1. Understand the Behavior in Context

Read the behavior's description and its steps, if it has any. Then consider the full plan:
- What other behaviors depend on this one
- What this behavior depends on
- How this behavior fits into the overall feature

#### 2. Investigate Affected Files

Identify every file this behavior will touch or create:
- Search the codebase for existing files in the affected area
- Read each affected file thoroughly — understand current state, not just surface-level structure
- Check imports, exports, and downstream consumers of affected files
- Note any files that other plan behaviors also touch (shared mutation points)

#### 3. Check if Already Implemented

Search for existing code that already satisfies this behavior:
- Grep for related function names, types, constants
- Check if tests already cover this behavior
- Look for partial implementations that might conflict

#### 4. Check for Conflicts and Mismatches

Compare what the plan says against what the codebase actually has:
- Does the plan assume a type/interface that doesn't exist or has a different shape?
- Does the plan reference files or functions by wrong names?
- Are there naming conventions the plan violates?
- Does this behavior's approach conflict with another behavior's approach?
- Are there race conditions or ordering issues between behaviors or between the steps inside one?

#### 5. Verify Dependencies

- Are the libraries/packages the plan relies on actually installed?
- Are the utilities/helpers the plan references actually available?
- If this behavior depends on another behavior's output, is that output format correct?

#### 6. Identify Edge Cases and Risks

- What happens with empty/null/undefined inputs?
- Are there error paths the plan doesn't account for?
- Performance implications for the approach described?
- Security concerns?

#### 7. Write Behavior Findings

Write findings to the `investigation-step-[N].md` artifact (one per behavior — the orchestrator folds each finding under its behavior or `Step N.M` in `plan-steps.md`, so tie every finding to the step it belongs to):

```markdown
# Investigation: Behavior [N] — [behavior description]

## Affected Files
| File | Step | Current State | Planned Change | Also Touched By |
|------|------|--------------|----------------|-----------------|
| [path] | [N.M, or "—" for a behavior with no steps] | [what it does now] | [what the plan says to do] | [other behavior numbers, or "none"] |

## Already Implemented
- [ ] Not implemented
- [ ] Partially implemented: [details]
- [ ] Fully implemented: [details]

## Conflicts Found
- [Conflict description, or "None found"]

## Plan Mismatches
- [Mismatch between plan and actual codebase, or "None found"]

## Missing Dependencies
- [Missing dep, or "All dependencies available"]

## Edge Cases / Risks
- [Edge case or risk, or "None identified"]

## Suggested Plan Fixes
- [Specific fix to the plan, with reasoning — a missing change is a new `Step N.M` inside this behavior, not a new heading]

## Verdict
- **Can proceed as planned**: yes | yes with fixes | needs rework
- **Blocking issues**: [list, or "none"]
```

Update `loop-state.json`: increment `investigation_step`.

### After All Behaviors Investigated

Write a consolidated `investigation-summary.md` artifact:

```markdown
# Investigation Summary

## Behaviors Investigated: [count]

## Behaviors That Can Proceed: [list]
## Behaviors Needing Fixes: [list with brief reason]
## Behaviors Needing Rework: [list with brief reason]
## Already Implemented: [list]

## All Suggested Plan Fixes
- [Fix 1]
- [Fix 2]
...
```

## Output

Report back to the orchestrator:
- How many behaviors were investigated
- How many need fixes vs can proceed as-is
- Any blocking issues found
