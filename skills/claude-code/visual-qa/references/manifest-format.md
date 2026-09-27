# Archive bookkeeping

Everything that lets a second run be cheap, and a fix be checked. All of it lives under `<archiveRoot>/` (gitignored) except the report, which goes in the project ([node-report.md](../nodes/node-report.md)).

```
.visual-qa/
  <viewport>/<feature>/<state>.png        capture, plus .2.png … for taller pages
  <viewport>/<feature>/<state>.meta.json  written by snap()
  _reference/<viewport>/<feature>/…png    copies of accepted captures
  manifest.json                           what was reviewed, against which catalogue and code
  _selection.json                         this run's choice, written by select-states.py
  findings.json                           findings in machine-readable form
  dismissals.json                         wrong findings, and known bugs
  _metrics.jsonl                          one line per run
```

Only `snap()` writes the captures and their sidecars; everything else is written by the review step. Sidecars exist because Playwright workers are separate processes and would race on a shared file.

## manifest.json

```jsonc
{
  "baseline": {                           // the code the last completed run captured
    "commit": "1d210f0e…",
    "dirty": { "src/new-panel.tsx": "sha256:77be…" }  // uncommitted then; null = deleted
  },
  "lastRun": "2026-09-22T09:14:22Z",
  "states": {
    "375x812/setup/empty": {
      "capturedAt": "2026-09-22T09:13:58Z",
      "reviewedAt": "2026-09-22T09:14:20Z",
      "reviewedAgainst": "sha256:9f2a…",   // catalogue version used for THIS state
      "verdict": "clean",                   // clean | findings | known-only
      "openFindings": [],                   // finding ids still unresolved here
      "sources": ["src/components/setup/setup.ui.tsx"],
      "reference": "_reference/375x812/setup/empty.png"
    }
  }
}
```

### Choosing what to re-run

[select-states.py](./select-states.py) decides; never pick by hand. It compares the code now with `baseline`: `git diff` from `baseline.commit` to the working tree, plus untracked files. Git keeps no record of uncommitted content, so `baseline.dirty` holds a hash of whatever was uncommitted when the last run captured.

A state is **re-captured and re-reviewed** when:

- one of its `sources`, or its feature's tour file, changed
- it has no capture on disk, or recorded no `sources` (nothing can prove it unchanged)
- the run is full: no `baseline`, a commit a rebase dropped, or a change matching `sharedPaths` in `visual-qa.json`

It is **re-reviewed without re-capture** when its `reviewedAgainst` is not the current catalogue, or its capture is newer than its review (a review that never landed). **The catalogue check is easy to omit and expensive to get wrong**: new entries must re-open every clean screen, or the tool goes quiet exactly when it gets smarter.

Everything else is **carried**: not captured, not reviewed, verdict and open findings unchanged.

- **`sharedPaths` is what keeps this honest.** `sources` name the files a tour writer thought of; the root layout, global CSS, the lockfile and the seed script shape every screen and appear in none. The script refuses to run without the list.
- **`baseline` moves only when a run completes.** After review, copy it from `_selection.json`. When a tour failed to re-capture a state, `--after-capture` removes it there, so the old baseline stays and those states stay selected.
- **Image hashes were the old rule, and failed.** A date or a count on the page changes the hash every run, and a failed capture leaves the old image, which hashes as unchanged.

### Reference images

A reference is the last accepted capture of the same state, handed to the reviewer as "what this screen looked like when it was judged". It roughly doubles review precision, so it has to actually exist as a file: **copy the images into `_reference/`**, don't just store a hash — the working capture gets overwritten next run.

Promote to reference when the verdict is `clean` **or** `known-only`. That second case matters: without it, a single site-wide defect (a wrong font on every screen) leaves every state permanently on `findings`, and no state ever gets a reference. When a reference carries a known issue, say so in the review brief so the model does not learn the defect as normal.

## findings.json

The report is for humans; this is what later runs read.

```jsonc
{
  "reportedAt": "2026-09-22T09:20:00Z",
  "commit": "1d210f0",                       // code the line numbers refer to
  "rootCauses": [
    { "id": "RC1", "summary": "unbreakable names widen every grid", "fix": "minmax(0,1fr) on the page grids" }
  ],
  "findings": [
    {
      "id": "F1",
      "defect": "element-offscreen",          // a catalogue entry id, or "off-list"
      "severity": "BLOCKING",                 // catalogue default, unless overridden
      "severityReason": "the voter cannot read who they are voting for",
      "likelihood": "only when a name has no spaces, e.g. a pasted email",
      "confidence": "confirmed",              // confirmed | possibly-intended | unverified
      "states": ["375x812/setup/long-names"], // every state showing it
      "element": "the Add button row",
      "sources": ["src/components/setup/setup.ui.tsx:196"],
      "rootCause": "RC1",
      "status": "open"                        // open | fixed | not-fixed | dismissed
    }
  ]
}
```

- **`states` is what makes a fix checkable.** It maps a finding back to the exact captures to re-take ([node-verify-fixes.md](../nodes/node-verify-fixes.md)).
- **`sources` is what makes a fix locatable**, and comes from the `sources` passed to `snap()`.
- **`severity` may be overridden** from the catalogue default, but only with a `severityReason`. A clipped label on a vote button is blocking for that voter even though `text-clipped` is normally degraded.
- **`likelihood` is required.** "Blocking, but only with a pasted email as a name" is a different decision from "blocking on every game".

## dismissals.json

```jsonc
{
  "dismissals": [
    {
      "kind": "not-a-bug",          // not-a-bug | known-bug
      "defect": "horizontal-page-scroll",
      "element": "table.report-grid",
      "state": "1280x720/reports/wide-table",
      "scope": "state",             // state | feature | project
      "reason": "the table scrolls inside its own container by design",
      "dismissedAt": "2026-09-22T09:20:00Z"
    }
  ]
}
```

- **`not-a-bug`**: never report it again in that scope.
- **`known-bug`**: real, already known, not worth re-reporting every run. It appears in the report's short "still open" list, and it does not block reference promotion.
- **Matching** is on `defect` + `element` within `scope`. Keep `element` as a selector or a stable name, not whatever wording the model used that day.
- `scope: "project"` silences a defect everywhere. Use it rarely; it is how a real bug disappears.
- A dismissal records a judgement at a point in time. If the element changes shape, re-check it rather than trusting the entry.

## _metrics.jsonl

One line per run, so the tool's own accuracy is measurable. No published baseline exists for this kind of tool, so the local number is the only trustworthy one.

```jsonc
{ "runAt": "2026-09-22T09:14:22Z", "statesReviewed": 47, "statesSkipped": 61,
  "candidates": 18, "refuted": 6, "reported": 12, "dismissedByUser": 5, "knownOnly": 3,
  "auditProblems": 4 }
```

- **`statesSkipped`**: the `carry` count [select-states.py](./select-states.py) printed.
- **`candidates`**: findings the review produced before verification.
- **`refuted`**: dropped by the verification step.
- **`reported`**: what reached the report.
- **`dismissedByUser`**: added to `dismissals.json` as `not-a-bug` afterwards.
- **`auditProblems`**: errors in the written report that the audit confirmed ([node-audit.md](../nodes/node-audit.md)) — wrong citations, wrong counts, misfiled root causes. It measures the write-up, not the findings.

`dismissedByUser / reported` is the false-positive rate. **A rising ratio means tighten the catalogue's definitions, never add more entries.** If it stays high across several runs, say so plainly: the pipeline is not earning its keep.
