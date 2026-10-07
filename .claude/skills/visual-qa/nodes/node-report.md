# Node: Report

Write the findings where the person fixing them will actually find them: in the project, with the screenshots beside them. Read this after [node-review.md](./node-review.md).

The archive under `.visual-qa/` is gitignored and disposable. The report is not — it goes in the repo, is meant to be read and committed by a human, and must still make sense a month later.

## Where it goes

```
<project>/qa-visual-defects/
  README.md
  images/01-setup-long-names-mobile.png
  images/02-reveal-long-name-mobile.png
  …
```

Override the folder with `"reportDir"` in `visual-qa.json` if the project has its own convention. **Copy** the images in — never link into `.visual-qa/`, which is gitignored and overwritten next run. Copy only the images the report actually shows, numbered by finding, named `<nn>-<feature>-<state>-<mobile|desktop>.png`.

**Write the files. Never commit them.** Tell the user the folder is there and let them decide.

## Check the code references before publishing

Findings were written against the commit recorded in `findings.json`. Before writing the report:

1. Re-read each cited `file:line` in the working tree and confirm it holds the thing the Fix changes, not just code near where the bug shows. Code moves between capture and write-up, and a page that renders a bug is often not the file that causes it.
2. Put the commit in the report's header, so line numbers mean something later.
3. Drop or re-locate any reference that no longer matches. A wrong line number costs the reader more than a missing one.

## Structure

**Header** — what was checked (URL or app, date, viewports, how many states), how (Playwright captures reviewed against a checklist), the commit the line numbers refer to, and one plain sentence that the fixes are proposals and which ones, if any, were actually tried.

**Severity key** — one line each: blocking, degraded, cosmetic.

**Summary** — three to five links to the findings that matter most, then the counts. This is the part most readers will read. Write the counts in exactly this form, so [check-report.py](../references/check-report.py) can verify them:

```md
- **52 findings** — 2 blocking, 37 degraded, 13 cosmetic
- **9 root causes** account for 27 of the 52 entries
```

**Root causes** — a section per shared cause, before the findings it explains, with the one fix that covers them all. Seven of the werewolf findings were one bug; presenting them as seven would have wasted the reader's time. Head each `### RC1 — <cause> (<n> findings)` and end it with `Covers findings 6, 7, 8.`

**A finding belongs to a cause only if that cause's fix would make it disappear.** A finding that needs a different change has a different cause. In the LMS run one cause claimed eleven findings and a single fix; four of them were ordinary text that wrapped fine, and the fix would not have touched them.

**Findings**, in order of harm — the Summary's order — with severity stated on every one. Don't group them by severity: sections per severity fight the harm order, and the LMS report ended up with Degraded findings under a Blocking heading. Each as:

```md
### 3. Night: wolves can't read who they're choosing

<img src="images/03-night-long-names-mobile.png" width="280" alt="Night turn at phone width; choice-button labels cut off on the right">

- **What's wrong:** one sentence, plain language, no jargon.
- **Where:** [night.ui.tsx:263](../src/components/night/night.ui.tsx#L263).
- **Fix:** a concrete change, not advice.
- **Severity:** Blocking — only when a name has no spaces, such as a pasted email.
```

Use `<img width="280">` for phone captures and `width="640"` for desktop, so a long report stays readable. Always write a real `alt`, and make sure the image shows what it names: if the thing is on the next tile of a tall page, embed that tile. If one image serves two findings, say so under the second.

**One defect is one finding.** A defect seen in two files, on two branches or as two symptoms is one finding, with every place in its Where. If you split it anyway for a second image, say under the second entry that it is the same defect. In the LMS run one misplaced status banner was reported as four findings.

**Every number is re-derived when you write it**, from the archive or the code, never recalled. A tile count is not a screen count: tiles overlap.

**Mark uncertainty in the finding itself**, never by leaving it out: "possibly intended" with the reason it might be deliberate.

**Caption any capture artifact visible in an evidence image.** If a screenshot shows a frozen clock or a masked region, say so under the image. Otherwise the reader chases a bug that does not exist.

**Noticed, not on the checklist** — the `off-list` items, in their own section, saying plainly that the checklist had no entry for them and that severity is an estimate. These are real findings; the trial's most serious single defect (an error page the user could not escape) came from here.

**Not covered by this pass** — states that were skipped, unreachable, or that a still image cannot show (hover, focus, keyboard). Also name the tiers captured ([node-capture.md](./node-capture.md)), so the reader knows what was not looked at.

**Carried from the last run** — how many states were not re-captured because their code did not change, and each open finding on them by title, pointing at the report that found it. They were not looked at again; never restate them as new findings.

## A mechanical trap

**Percent-encode brackets and parentheses in links.** A Next.js path like `src/app/(dashboard)/[lang]/layout.tsx` must be written `../src/app/%28dashboard%29/%5Blang%5D/layout.tsx#L49`. An unencoded `)` ends the link early and an unencoded `[` breaks it; both fail silently. Links, images and counts are checked in the next step.

## Closing the loop

End the report with the standing limits, in one short paragraph: this is a net, not a gate — on measured evidence this kind of review catches roughly 40% of real defects and roughly 40% of what it reports is wrong. A clean run means nothing was found, never that the UI is correct.

Then audit the report before handing it over: [node-audit.md](./node-audit.md).
