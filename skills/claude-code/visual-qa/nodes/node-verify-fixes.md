# Node: Verify fixes

Check whether the reported defects are actually gone, by re-capturing **only** the screens the code change could have touched. Run this after someone has applied fixes from a report.

Nothing here re-reviews the whole app. A small fix should cost a small run.

## 1. Read what the last run found

From `<archiveRoot>/findings.json`: the `commit` the findings were written against, and each finding's `states`, `sources` and `status`. From `manifest.json`: every state's `sources`.

## 2. Work out what changed

```bash
python3 <skill dir>/references/select-states.py
```

It prints the tours whose code changed since the last run, uncommitted edits and shared paths included ([rules](../references/manifest-format.md#choosing-what-to-re-run)). Don't diff by hand: `git diff <commit>..HEAD` misses a fix that is not committed yet.

## 3. Choose the states to re-capture

Take the union of:
- every state listed on a finding whose `status` is `open`
- **every state the script selected**, finding or not

The second half is the point. A fix for one screen often breaks another, and these are the states that would show it.

**A change to a shared file fans out, and that is correct.** A change matching `sharedPaths` selects every state. Don't trim that back; a change to a shared file is exactly when a wide re-check is worth paying for.

If a finding's states cannot be reached any more because the flow itself changed, say so and leave the finding open. Never mark a finding fixed because its screen no longer exists.

## 4. Keep the "before" images

Re-capturing overwrites the current images, and a state with open findings has no `_reference/` copy. **Before running anything**, copy the selected states' current images to `<archiveRoot>/_before/<timestamp>/…`, keeping their paths.

## 5. Re-capture just those states

State names are `<feature>/<state>` and tours live at `e2e/visual/<feature>.tour.ts`, so the features involved name the files to run. That naming convention is what makes a partial run possible — it is load-bearing, not cosmetic.

```bash
npx playwright test --config playwright.visual.config.ts e2e/visual/setup.tour.ts e2e/visual/day.tour.ts
```

Run whole tour files rather than filtering by test name: a tour usually walks several states in sequence, and cutting into the middle of that sequence produces states that were never actually reached.

Then run `select-states.py --after-capture`. It names any selected state the tours failed to re-capture, and a failed capture is never a fix. For open-finding states the script did not select, check that each sidecar's `capturedAt` is newer than your `_before` copy.

## 6. Review before against after

Same rules as [node-review.md](./node-review.md) — closed list, name the element, no invented numbers, check the capture flags first — with the `_before` image supplied as the reference.

For each open finding on these states, return one of:
- **fixed** — the defect is gone from every state that showed it
- **not-fixed** — still present; say whether it changed at all
- **partly-fixed** — gone at one viewport, still there at another (list which)
- **unreachable** — the state could not be reached; the finding stays open

For a sideways-scroll finding, `pageWidth` back at the viewport width in the new `meta.json` is the proof of a fix. An image that merely looks narrower is not.

Then review the re-captured states normally for anything new. A defect that appears in a state that was clean before is a **regression**, recorded as a new finding with `"cause": "introduced-by-fix"`.

## 7. Write the results

- **`findings.json`**: update each finding's `status`; add regressions as new findings; record `verifiedAt` and the commit verified.
- **`manifest.json`**: update the re-captured states, adopt the new `baseline` as in [node-review.md](./node-review.md#write-the-results), and promote the now-clean ones to `_reference/`.
- **`_metrics.jsonl`**: one line for the check — states re-captured, fixed, not fixed, regressions.
- **The report**: add a dated "Fix check" section rather than rewriting history. Per finding: one line of verdict, and for the fixed ones a before-and-after pair, copied into the report's `images/` as `<nn>-before.png` and `<nn>-after.png`.

```md
## Fix check — 2026-09-22 (commit a1b2c3d)

- **1. Setup: buttons pushed off the phone screen** — fixed.

  <img src="images/01-before.png" width="240" alt="Before: Add and Options buttons off-screen">
  <img src="images/01-after.png" width="240" alt="After: both buttons visible at phone width">

- **8. Vote buttons cut long names off** — not fixed. The label still runs past both edges at 375.
- **New: 21. Setup heading now wraps mid-word** — regression, introduced by the fix for root cause RC1.
```

Findings that were never re-captured are not mentioned in the fix check at all. Silence there means "not checked", and the section says so in one line.
