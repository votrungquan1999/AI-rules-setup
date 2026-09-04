# Node: Mutation Pass

Prove the suite would actually catch a defect, by injecting one and watching a test go red. Runs **once per run** in Phase 5c — never inside the Phase 4 loop.

> **Runs ALONE.** Unlike 5a/5b this pass writes to the source tree, so it cannot overlap with anything that reads or tests it. Execute it only after 5a and 5b are both done.

> **Report only — never fix, never touch git.** A survivor is a finding for the user to triage, not a licence to add tests or edit code.

## Input

- `mutation-plan.md` artifact — the user's Phase 4·0 answer. **If `Mutation: off`, write nothing and report "skipped per run options" immediately.**
- `step-result.md` and `plan-steps.md` artifacts — the behaviors implemented and the files each changed. Mutate only those.
- The project's test command (`package.json` / `pyproject.toml` — never hardcode a runner).

## The rule that decides the cost

**Every mutant names only the tests that execute the mutated file.** A defect in `sizing.py` can only be killed by tests running `sizing.py`; adding eight other test files costs 10-20x and finds nothing extra. A real run that passed all 9 target files to all 96 mutants spent 62 minutes to surface 8 findings. `mutation-harness.py` refuses a mutant with no `tests` list, but it cannot tell a narrow list from a lazy one.

## Budget

**≤3 mutants per behavior, ≤30 per run.** Spend them on the riskiest thing the behavior introduced — a boundary (`>=` → `>`), a sign, a constant encoding intent (tilt, threshold, default), a branch that silently no-ops. Stop early on a file once its mutants all die. Skip generated code, config plumbing, and out-of-scope paths.

## Execution

1. **Pick mutants.** Per behavior, read its diff and choose up to 3 defects a wrong implementation would plausibly have. A good mutant is one whose verdict you cannot predict; if you already know a test pins it, it is a wasted minute.
2. **Write the `mutants.json` artifact** — `[{"name","file","old","new","tests":[...]}]`. `old` must occur **exactly once** in `file`; the harness rejects an ambiguous match rather than mutating a line you did not mean.
3. **Run the shipped harness** — never hand-roll one, never mutate by editing files directly:

   ```bash
   python3 <skill dir>/nodes/mutation-harness.py <mutants.json path> <results.json path> \
     --repo <repo root> --test-cmd "<project test command>"
   ```

   It restores in a `finally`, aborts loudly if a restore fails, rejects a red baseline (against which every mutant reads as KILLED), and redirects bytecode caching so a same-length mutation (`2.5` → `1.0`, `max` → `min`) cannot leave a stale `__pycache__` that makes later runs execute the mutant. Add the runner's parallel flag (`-n auto`, `--pool=threads`) to `--test-cmd` — that is the safe place to parallelize.
4. **Triage each survivor** into exactly one of: **false green** (real behavior, nothing pins it — the finding; name the test and the missing assertion), **equivalent mutant** (cannot change observable behavior — say why), **out of scope** (deliberately untested per the plan). Re-read the test before classifying. Do NOT add the missing test — that is the user's call and becomes a new behavior with its own commit.
5. **Confirm the tree is clean** — re-run the project's test command over the mutated files (green), and confirm the sources are byte-identical to their pre-run state. A leaked mutant corrupts every later step.

## Output

Write the `mutation-results.md` artifact: budget and counts (killed / survived / apply-fail); one section per **false green** with the defect injected, the tests that should have caught it, why they didn't, and severity; a short list of non-findings with reasons; and the post-restore tree state.

Report: counts, the false-green findings with severity, and confirmation the tree is clean.
