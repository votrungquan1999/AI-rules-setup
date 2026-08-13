# Node: Commit Protocol

How this run turns behaviors into commits. Read it before committing, or before fixing code that is already committed.

## Two strategies

The orchestrator asks the user once, before implementation starts, and records the answer in the `commit-plan.md` artifact. **Read that artifact before touching git** — if it says `Strategy: defer`, never run `git add`, `git commit`, or `git rebase` at all.

- **`per-behavior`** — one commit per behavior, made as soon as that behavior is green; every later fix folds back into its commit. The branch ends with **exactly one commit per behavior** in the plan.
- **`defer`** — the run never commits; changes accumulate in the working tree for the user to commit at the end.

## The `commit-plan.md` artifact

```markdown
# Commit Plan

Strategy: per-behavior | defer
Base: [sha captured before the first behavior commit]
Branch: [branch name]

| Step | Commit subject | Status |
|------|----------------|--------|
| 1 | feat(market): a trader sees trending markets at the top | committed |
```

**Store subjects, not SHAs.** Every autosquash rewrites the SHA of the folded commit and everything after it, so a recorded SHA goes stale on the first fold. Subjects are stable — resolve the SHA when needed.

## Committing a behavior

Once the behavior is green and its tests pass:

1. Stage **explicit paths only** — the files listed for this step in `step-result.md`. Never `git add -A`, `-a`, or `.`; the tree may hold unrelated work.
2. One commit, subject naming the behavior in the repo's existing convention (e.g. `feat(scope): [behavior]`).
3. Record the row in `commit-plan.md` as `committed`.

Capture `git rev-parse HEAD` into `Base:` **before** the run's first behavior commit.

## Folding a fix into its owning behavior

Any fix to already-committed behavior code — quality-gate refactor, conformance fix, accepted adversarial finding — belongs in that behavior's commit, not a new one; otherwise the commit count drifts above the behavior count.

1. Resolve the owning commit **by subject**: `git log --format='%H %s' [base]..HEAD`, match against `commit-plan.md`.
2. Check it is not already published (see rails).
3. Stage explicit paths, then:
   ```
   git commit --fixup [sha]
   GIT_SEQUENCE_EDITOR=true git rebase --autosquash [base]
   ```
   `GIT_SEQUENCE_EDITOR=true` is what keeps the rebase non-interactive — without it it hangs waiting for an editor.
4. Re-run the affected tests afterwards; a clean autosquash still reorders work.

**A fix that adds genuinely new behavior is not a fold** — it is a new plan step with its own commit. One commit per behavior means adding a behavior adds a commit.

## Safety rails

- **Never rewrite a published commit silently.** Check `git branch -r --contains [sha]` (or compare against `@{upstream}`) first. If it is already on the remote, **STOP and escalate** — the user chooses between folding plus `git push --force-with-lease`, or an ordinary follow-up commit that breaks the one-per-behavior count. Never force-push on your own initiative.
- **Never rebase a dirty tree.** Commit or stash the fix first; an autosquash over uncommitted changes loses them.
- **A rebase conflict is an escalation.** Stop and hand it back. Never resolve with `-X ours` / `-X theirs` — it silently discards one side.
- **Only one execution touches git at a time.** Parallel batches committing or rebasing one branch corrupt each other's history. The verification passes (5a, 5b) **report only — never stage, commit, or rebase**; the single fix pass that follows does the git work.
- **Verify location first** — `git rev-parse --show-toplevel`; the working directory drifts between nested repos and worktrees.
