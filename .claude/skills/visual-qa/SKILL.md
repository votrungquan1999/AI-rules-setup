---
name: visual-qa
description: Finds UI defects a human would spot instantly — overlapping or cut-off content, layouts broken by long names, empty and error screens, unreadable text, junk like "undefined" on screen — by screenshotting every meaningful app state with Playwright and reviewing each against a defect catalogue, then writing a report with screenshots, file:line and proposed fixes into the repo. Use when the user says "visual QA", "check the UI", "find UI bugs", "review how the app looks", "screenshot the app and check it", or asks why a UI problem was not caught by tests.
---

# Visual QA

You are the **orchestrator**. You resolve what to capture, spawn sub-agents to do the reviewing, and write the report. The heavy image reading stays in sub-agents, out of this session's context.

This is not a test suite. It is a **net**: on measured evidence this kind of review catches roughly 40% of real defects, and roughly 40% of what it reports is wrong. Say so in the report. A clean run means nothing was found — never that the UI is correct.

## Pipeline

1. **setup** — once per project → [nodes/node-setup.md](nodes/node-setup.md)
2. **capture** — list states ranked by harm, write tours, screenshot → [nodes/node-capture.md](nodes/node-capture.md)
3. **review** — parallel sub-agents judge states against the catalogue, then verify → [nodes/node-review.md](nodes/node-review.md)
4. **report** — write findings + images into the repo → [nodes/node-report.md](nodes/node-report.md)
5. **audit** — check the written report, mechanically and with a fresh agent → [nodes/node-audit.md](nodes/node-audit.md)
6. **verify fixes** — later, after someone fixes things → [nodes/node-verify-fixes.md](nodes/node-verify-fixes.md)

Steps 1–5 are one run. Step 6 is a separate, much smaller run.

## Routing

- **No `visual-qa.json` in the project** → start at setup.
- **User asks for a visual QA pass** → capture, then review, then report, then audit.
- **User asks to check fixes, or has just fixed reported defects** → verify fixes only. Never re-run the whole app for this.
- **User asks what was found before** → read `<archiveRoot>/findings.json` and the report; don't re-run.
- **User reports one broken screen** → capture just that feature's states; the pipeline still applies, at one feature's scale.

## References

- [references/defect-catalogue.md](references/defect-catalogue.md) — the 85 named defects the review checks. **This file is the product**: an open prompt scores 6.67% precision, this closed list takes the same model to 57.8%. It grows from every real bug found.
- [references/snap.ts](references/snap.ts) — the capture helper, copied into the project.
- [references/check-report.py](references/check-report.py) — the report's mechanical check, run in place from the skill.
- [references/select-states.py](references/select-states.py) — picks the tours to re-run and the states to re-review from what git says changed since the last run.
- [references/review-state.sh](references/review-state.sh) and [references/reviewer-prompt.md](references/reviewer-prompt.md) — the lean per-state reviewer and its instructions.
- [references/manifest-format.md](references/manifest-format.md) — archive bookkeeping: what was reviewed, findings, dismissals, metrics.

## Invariants

Short list, each load-bearing. The reasons are in the node files.

- **Capture runs only under the visual config.** `snap()` and `prepareVisualPage()` do nothing otherwise, so ordinary e2e runs stay fast and keep the real clock.
- **Rank states by how likely they are to hurt someone**, not by how many branches the code has. "Nobody would do that" is not a reason to skip; proof from the code is.
- **Ask the catalogue, not the screenshot.** "Is defect X present?" per entry, never "what's wrong here?".
- **Every finding names an element**, or it is dropped.
- **Never report a number that was not read off the page or measured by `snap()`.** Vision models do not measure; the capture does, and records `pageWidth`.
- **Check the capture flags before the content.** `stable: false` or `fontsSettled: false` means a suspicious pixel is probably the capture, not the app.
- **Verify adversarially, in a separate call.** A model checking its own work in the same breath agrees with itself.
- **Anything the catalogue misses still gets reported**, in the report's off-list section, and becomes a candidate entry.
- **The report goes in the repo, never only in the gitignored archive.** Write it; never commit it.
- **Audit the report with an agent that has not seen the pipeline.** Every finding can be true while the document around them is wrong.

## Cost

The LMS run cost about $95 for 91 states at one viewport, plus $16 to audit and correct the report. Most of it was context being re-read: every turn re-reads the conversation so far, so long agents cost far more than short ones. Keep it down by:

- **one lean agent per state for review** ([review-state.sh](references/review-state.sh)): ~1.7k tokens at start instead of ~46k, and no earlier screens to re-read
- **results written to files, one line returned**, by every agent, so the orchestrator's context stays small
- **a project brief before the tour writers start**, so none of them spends its turns rediscovering the app
- **re-running only what changed** ([select-states.py](references/select-states.py)): a state whose code did not change since the last run is neither captured nor reviewed again
- **re-capturing only what a code change touched** when checking fixes
