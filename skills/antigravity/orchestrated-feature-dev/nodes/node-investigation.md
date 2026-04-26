# Node: Investigation

Deep-dive investigation of each plan step. Runs sequentially — one step at a time — with full plan context throughout.

## Input

- Read the `implementation-plan.md` artifact for the **full plan** (all steps, technical design, architecture decisions)
- Read the `plan-steps.md` artifact for the step list
- Read `loop-state.json` for the current investigation progress

## Execution

### For Each Step in the Plan

Investigate every step sequentially. For each step N:

#### 1. Understand the Step in Context

Read the step's behavior description. Then consider the full plan:
- What other steps depend on this one
- What this step depends on
- How this step fits into the overall feature

#### 2. Investigate Affected Files

Identify every file this step will touch or create:
- Search the codebase for existing files in the affected area
- Read each affected file thoroughly — understand current state, not just surface-level structure
- Check imports, exports, and downstream consumers of affected files
- Note any files that other plan steps also touch (shared mutation points)

#### 3. Check if Already Implemented

Search for existing code that already satisfies this step's behavior:
- Grep for related function names, types, constants
- Check if tests already cover this behavior
- Look for partial implementations that might conflict

#### 4. Check for Conflicts and Mismatches

Compare what the plan says against what the codebase actually has:
- Does the plan assume a type/interface that doesn't exist or has a different shape?
- Does the plan reference files or functions by wrong names?
- Are there naming conventions the plan violates?
- Does this step's approach conflict with another step's approach?
- Are there race conditions or ordering issues between steps?

#### 5. Verify Dependencies

- Are the libraries/packages the plan relies on actually installed?
- Are the utilities/helpers the plan references actually available?
- If this step depends on another step's output, is that output format correct?

#### 6. Identify Edge Cases and Risks

- What happens with empty/null/undefined inputs?
- Are there error paths the plan doesn't account for?
- Performance implications for the approach described?
- Security concerns?

#### 7. Write Step Findings

Write findings to the `investigation-step-[N].md` artifact:

```markdown
# Investigation: Step [N] — [behavior description]

## Affected Files
| File | Current State | Planned Change | Also Touched By |
|------|--------------|----------------|-----------------|
| [path] | [what it does now] | [what the plan says to do] | [other step numbers, or "none"] |

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
- [Specific fix to the plan, with reasoning]

## Verdict
- **Can proceed as planned**: yes | yes with fixes | needs rework
- **Blocking issues**: [list, or "none"]
```

Update `loop-state.json`: increment `investigation_step`.

### After All Steps Investigated

Write a consolidated `investigation-summary.md` artifact:

```markdown
# Investigation Summary

## Steps Investigated: [count]

## Steps That Can Proceed: [list]
## Steps Needing Fixes: [list with brief reason]
## Steps Needing Rework: [list with brief reason]
## Already Implemented: [list]

## All Suggested Plan Fixes
- [Fix 1]
- [Fix 2]
...
```

## Output

Report back to the orchestrator:
- How many steps were investigated
- How many need fixes vs can proceed as-is
- Any blocking issues found
