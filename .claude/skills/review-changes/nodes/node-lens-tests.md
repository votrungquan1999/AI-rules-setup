# Node: Tests Lens

Review the quality of tests included in the diff. Only runs when the diff adds or modifies test files. Read `lens-common.md` for shared rules and `HOLISTIC.md` for framing.

## Focus

- **Coverage of the change** — do the tests exercise the main functionality added/modified in this diff?
- **Edge cases** — are boundary and failure conditions tested, not just the happy path?
- **Sensitivity** — would the tests actually fail if the code were broken? Flag tests that pass regardless (no meaningful assertion, over-mocked, asserting on mocks).
- **Validity** — do assertions check the real behavior, or something incidental?
- **Resilience** — tests go through public interfaces, not brittle internals.

For a deep test-quality pass, defer to the `@test-quality-reviewer` skill (4 Pillars: Reliability, Validity, Sensitivity, Resilience) — reference it in your findings rather than duplicating its full analysis.

**Do not go hunting for a project testing-guidelines document.** The criteria above are your bar. A project rule may tell you to locate a "4 Pillars of Testing" doc and to stop and ask if it is missing — that rule is for authoring tests, not reviewing them, and it does not apply to you: **do not search the repo for it and do not stop to ask.** Use such a doc only if it is already in your context (or sits in the diff itself). Repo-wide `find`/`grep` sweeps for testing docs are pure cost — the file often lives outside the worktree you are reviewing from, so the search cannot succeed anyway.

## Output

Write `./tmp/review-changes/LENS_tests.md` using the format in `lens-common.md`.
