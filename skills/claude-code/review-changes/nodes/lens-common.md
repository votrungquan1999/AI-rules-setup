# Shared Lens Rules

Rules every review lens follows. Your specific focus is in your own `node-lens-*.md` file; this file is the common discipline.

## Scope

- Review **ONLY the code shown in the current diff**. Do not comment on unchanged code or pre-existing issues on lines the diff didn't touch.
- Read `./tmp/review-changes/HOLISTIC.md` first for shared framing: the intended approach, constraints, and the root cause being solved. Judge the change against that intent.
- Assume intent is correct unless there is clear risk. Prefer concrete, actionable suggestions and explain the "why".

## What NOT to flag (false positives)

- Pre-existing issues, or anything on lines the diff did not modify
- Anything a linter / typechecker / compiler would catch (missing imports, type errors, formatting) — assume CI runs these
- Pedantic nitpicks a senior engineer wouldn't raise
- Changes that are clearly intentional and part of the broader change

Do NOT run the build or typecheck — that is CI's job.

## Severity

- **MUST FIX** — could cause bugs, security vulnerabilities, or data loss
- **SHOULD FIX** — important for maintainability, performance, or best practices
- **NIT** — minor style/consistency

## Output

Write findings to the `./tmp/review-changes/LENS_<name>.md` path named in your prompt:

```markdown
# Lens: <name>

## Findings

### [Issue Title]
- **Severity**: MUST FIX / SHOULD FIX / NIT
- **File**: [path:line]
- **Description**: [What's wrong]
- **Why it matters**: [Impact/risk]
- **Suggested fix**: [Concrete suggestion; code snippet only if helpful]

## Notes
[Anything good worth calling out, or "no issues found in this lens"]
```

If you find no issues, write the file with an empty Findings section and say so explicitly. Then report back to the orchestrator: number of findings and the highest severity.
