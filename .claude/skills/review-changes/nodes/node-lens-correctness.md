# Node: Correctness Lens

Find logic bugs and behavioral defects in the diff. Read `lens-common.md` for shared rules and `HOLISTIC.md` for framing.

## Focus

1. **Logic & correctness**
   - Does the code do what the intended approach (from HOLISTIC.md) says it should?
   - Off-by-one errors, inverted conditions, wrong operators, incorrect control flow
   - State mutated incorrectly, stale reads, ordering assumptions

2. **Edge cases & error handling**
   - Null/undefined/empty inputs, empty collections, boundary values
   - Are failure paths handled, or do they fall through silently?
   - Concurrency / race conditions / async ordering where relevant

Performance is **out of scope** for this lens — the performance lens owns algorithmic complexity, N+1 queries, and hot-loop work. Raise a perf issue here only if it also causes a *wrong result* (e.g. a timeout that silently drops data), not merely slowness.

Stay in the diff. A correctness claim about unchanged code is out of scope.

## Output

Write `./tmp/review-changes/LENS_correctness.md` using the format in `lens-common.md`.
