# Node: Audit

Check the report itself before handing it over. Read this after [node-report.md](./node-report.md).

Review and verification both attack the findings. Nothing attacks the document written around them, and that is where errors survive. In the LMS run an independent audit found no false findings, yet the report cited a file that did not contain the bug, credited one fix with defects it could not fix, stated a tile count as a screen count, put a screenshot under the wrong finding, counted one bug four times and carried four sums that did not add up. The link check passed the whole time.

## Step 1: the mechanical check

From the report folder:

```
python3 <skill dir>/references/check-report.py README.md
```

[check-report.py](../references/check-report.py) checks what arithmetic and file lookups can prove:

- every finding has a severity label
- the stated total and the severity breakdown match those labels
- each root cause lists as many findings as its heading claims, and the causes add up to the stated total
- every source link points at a real file, and at a line inside it
- every anchor and every image exists, and nothing sits in `images/` unused

It parses only the formats [node-report.md](./node-report.md) prescribes; a count written any other way is neither checked nor to be trusted. Fix and re-run until it prints `problems: 0`.

It cannot tell whether a cited line is the right line, or whether an image shows what the text says. That is step 2.

## Step 2: an audit by an agent that has not seen the pipeline

Spawn a fresh subagent and give it only the report, its images, the archive and the repo — not the reviewers' output, not your notes. The author of a report believes its own "every file:line was re-checked"; a reader who was not there does not.

Tell it to be harsh and to edit nothing. It checks:

- **Every `Where:`** — open the file at that line. Is the thing the Fix changes actually there? A file where the bug shows up but whose code does not cause it is a wrong citation.
- **Every root cause** — for each finding it lists, would that one fix make the finding disappear? A finding that needs a different change has a different cause.
- **Every number stated as fact** — re-derive it from the archive or the code. "Eleven screens tall" was eleven overlapping tiles, about nine screens.
- **Every image** — does it show what its finding and its `alt` say? Is the thing named in this tile, or the next?
- **Duplicates** — is any finding the same defect as another, seen in a second file, on a second branch or as a second symptom?
- **Claims it cannot re-run** — a live HTTP status, a pixel sample, a database read once the server is down. List them as unverifiable; do not accept them.

It writes the problems it found, each with its location and evidence, to `<archiveRoot>/_audit.md`, and returns one line saying how many.

## Step 3: verify, fix, re-check

Check each audit problem yourself before acting on it; the auditor can be wrong too. Fix the report, re-run step 1, and record the number of confirmed problems as `auditProblems` in `_metrics.jsonl` ([format](../references/manifest-format.md#_metricsjsonl)).

Then hand the report over. Fixes are checked later, in a separate run: [node-verify-fixes.md](./node-verify-fixes.md).
