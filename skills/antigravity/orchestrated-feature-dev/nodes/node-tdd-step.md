# Node: TDD Step

Execute one red-green-refactor cycle for a single observable behavior.

## Input

Read `/tmp/workflow-state/plan-steps.md` to find the next `pending` step.
Read `/tmp/workflow-state/loop-state.json` for the current step counter.

## Execution

### 1. Identify the Behavior
Find the first step with `Status: pending` in `plan-steps.md`. This is your target behavior.

### 2. Write the Test
Use BDD-style Given/When/Then structure:

```typescript
describe("[Feature/Scenario name]", () => {
  it("should [expected outcome]", async () => {
    // Given
    // When
    // Then
  });

  // Use nested describe only to group multiple related tests:
  // describe("when [specific condition]", () => {
  //   it("should [outcome A]", ...);
  //   it("should [outcome B]", ...);
  // });
});
```

### 3. 🚫 GATE: Run the Test

Run the test. You **MUST** see the result before writing ANY implementation code.

- **If it fails** → proceed to step 4
- **If it passes** → behavior is already covered. Update `plan-steps.md` to mark this step as `done (already covered)`. Skip to Output.

### 4. Implement

Write the **minimum code** to make the test pass. Nothing more.

### 5. Run the Test Again

Confirm it passes. Also run any related previous tests to check for regressions.

- **If all pass** → proceed to Output
- **If regression** → fix the regression, run tests again

### 6. Quick Refactor (Optional)

Only if there's an obvious improvement. Keep it small. Run tests again.

## Output

Update `/tmp/workflow-state/plan-steps.md`:
- Change the completed step's status to `done` (or `done (already covered)`)

Write to `/tmp/workflow-state/step-result.md`:

```markdown
# Step Result

## Step: [step number]
## Behavior: [what was implemented]
## Test Result: [red → green | already covered]
## Files Changed:
- [file1]: [what changed]
- [file2]: [what changed]
## Regressions: [none | list]
## Notes: [anything worth mentioning]
```

Update `loop-state.json`: increment `current_step`.
