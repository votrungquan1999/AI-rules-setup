# Node: Review

Judge the captured states against the defect catalogue and produce findings. Read this after [node-capture.md](./node-capture.md); the write-up itself is [node-report.md](./node-report.md).

## Before reviewing

1. **Record the commit** the run refers to: `git rev-parse --short HEAD`. Findings cite `file:line`, and code moves.
2. **List the states to review**: `python3 <skill dir>/references/select-states.py --after-capture > states-to-review.txt`. It adds the states a tour captured for the first time; unchanged states are left out, and their verdicts and open findings carry forward ([rules](../references/manifest-format.md#choosing-what-to-re-run)).
3. **`NOT CAPTURED: <state>`** (exit 1) means the tour failed, or no longer reaches that state. Fix the tour and capture again, or drop the state from the manifest and say so in the report. Never review its old picture.
4. **Load `dismissals.json`**, and keep only the entries whose scope covers each state.

## One short-lived agent per state

Each state gets its own headless reviewer, run by [review-state.sh](../references/review-state.sh). It judges every viewport of that state together, writes `<archiveRoot>/_reviews/<feature>/<state>.json`, and prints one line. Read the lines, not the files, until you write the report.

```
S=<skill dir>/references
head -1 states-to-review.txt | xargs -I{} $S/review-state.sh .visual-qa {} e2e/visual/review-notes.md   # the first one alone
tail -n +2 states-to-review.txt | xargs -P 6 -I{} $S/review-state.sh .visual-qa {} e2e/visual/review-notes.md
```

- **Why lean.** A default agent starts at ~46k tokens (149 tool definitions, 10 MCP servers, 40 skills, the project's rules) and costs $0.46 to reply "OK". The script allows only Read, loads no settings or MCP, and runs outside any repo so no CLAUDE.md or rules are found: ~1.7k tokens. Never review through a default subagent.
- **Why one per state.** A reviewer holding a whole feature re-reads every earlier screen while judging the next, though the screens are independent. In the LMS run feature-level reviewers cost $0.29 a screen; one lean agent per screen cost $0.08–0.15.
- **Why the first runs alone.** It caches the prompt and catalogue, and every later call reads them at a tenth of the price.
- **The notes file** (`e2e/visual/review-notes.md`) lists this project's known capture artifacts, such as a dev-tools badge or mocked text. The generic prompt cannot know them: without a note, the LMS reviewer reported the Next.js dev indicator as `overlap-elements` twice in four screens.
- **Dismissals are applied after review.** The reviewer never sees `dismissals.json`; drop any finding a dismissal in scope covers before verification.
- **No `claude` on the PATH** (a web or desktop host): fall back to one subagent per state. Still one state each, but expect the ~46k start.

The reviewer's instructions are [reviewer-prompt.md](../references/reviewer-prompt.md) followed by the catalogue. Its four rules are the difference between 6.67% and 57.8% precision; change them only with evidence.

## Verify every candidate, adversarially

A second call per candidate, whose job is to **refute** it. Verifiers need the repo to prove behaviour claims, so they are ordinary subagents rather than the lean script, batched a few features each: one per state would pay the ~46k start every time. Each writes its verdicts to `<archiveRoot>/_verdicts/<feature>.json` and returns one line. Keep it separate from the review call: a model asked to check its own work in the same breath agrees with itself. In the first trial this step rejected only 1 of 18 candidates and let a capture artifact through, because it was given too little.

Give the verifier:
- the finding, and the images it came from
- **the catalogue entry's exact text** — it must hold the finding to that definition, not to a loose paraphrase
- **the capture's `meta.json`** — so it can spot artifacts
- rule 3 above, so it does not invent measurements of its own

Refute the finding when any of these is true:
- the capture flags explain it (unstable capture, unfinished load)
- the catalogue entry's definition is not actually met, only something near it
- the element cannot be identified in the image
- a dismissal already covers it

Refuted findings are dropped silently and counted in `_metrics.jsonl`.

## Claims a screenshot cannot prove need code

A finding may only describe what is visible. Anything about what happens *next* — "no revote follows", "Reload fails again", "the value never arrives" — must cite the code path that proves it, or be marked `unverified` and phrased as an observation. In the werewolf run, three such claims were true and provable in code; stating them without that check would have been guessing.

## Deduplicate, then group by cause

- **Dedupe** on `defect` + `element` + source file, across viewports and states. One study's 197 findings were 33 real bugs, and a single site emitted 147 reports for one of them.
- **Group into root causes.** Seven of the werewolf findings were one bug: unbreakable names widening every grid. One shared cause with one fix is far more useful than seven separate findings, and it is how the report is ordered.

## Judge each finding twice over

- **Severity**: `BLOCKING` (the user cannot do what they came to do), `DEGRADED` (works but wrong), `COSMETIC`. Use the catalogue's default unless you record a `severityReason` — a clipped label on a vote button is blocking for that voter even though `text-clipped` is normally degraded.
- **Likelihood**: what has to happen for a user to hit it. "Only when a name has no spaces" is a different decision from "on every game". Required on every finding.
- **Confidence**: `confirmed`, `possibly-intended` (the styling may be deliberate — ask once, then record the answer as a dismissal so it stops coming back), or `unverified`.

## Write the results

- **`findings.json`** — the machine-readable findings, root causes and the commit ([format](../references/manifest-format.md#findingsjson)). Later runs and the fix check read this, not the report.
- **`manifest.json`** — for each reviewed state: `sources` and `capturedAt` from its sidecar, `reviewedAt`, `reviewedAgainst` (the `catalogueVersion` in `_selection.json`), `verdict`, `openFindings`. Carried states keep their entries. Reference images need no step here: the next run's `select-states.py` saves the clean and known-only ones before its tours overwrite them.
- **`baseline`** — copy it from `_selection.json` into the manifest. **If it is missing there, a capture failed: keep the old one**, so the next run still re-captures those states.
- **`_metrics.jsonl`** — one line: states reviewed and skipped, candidates, refuted, reported.

Then write the report: [node-report.md](./node-report.md).
