# Node: Validation

Validate one completed step after implementation.

## Input

- `tmp/orchestrated-feature-dev/implementation-plan.md`
- `tmp/orchestrated-feature-dev/PLAN_STEPS.md`
- `tmp/orchestrated-feature-dev/IMPLEMENTATION_PROGRESS.md`
- Assigned step number `N`

## Workflow

1. Confirm implementation matches planned behavior.
2. Verify step-specific tests actually assert intended outcome.
3. Check cross-step consistency for shared files.
4. Run step-relevant tests.
5. Classify result.

## Output

Write `tmp/orchestrated-feature-dev/VALIDATION_STEP_<N>.md`:

```markdown
## Step
## Plan Match: yes | partial | no
## Test Quality and Coverage
## Cross-Step Conflicts
## Issues Found
## Verdict: valid | valid-with-caveats | invalid
```
