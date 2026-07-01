# Step 1: Open the Card

Create the card that tracks this session's work, announce it, and rename the session to match.

## Gather the inputs

1. **Tags** — read `.ai-rules.json` at the repo root and take its `scope` array as the tags. If the file or the `scope` key is absent, ask the user which tags to use and proceed with their answer.
2. **Session id** — read `$CLAUDE_CODE_SESSION_ID` from the shell. A real Claude Code session always has this set, and `create_card` **requires a non-empty value**. If it is somehow missing, **tell the user and stop** — do not pass a blank string (the tool will reject it), and do not create an untracked card behind their back.
3. **Task name** — infer a short title from the work (a few words, imperative — e.g. "Add staled-card auto-park").

## Action

Call the dispatch tool:

```
create_card({
  title: <task name>,
  description: <one-sentence summary of the goal, optional>,
  tags: <scope array from .ai-rules.json>,
  sessionId: <$CLAUDE_CODE_SESSION_ID>,
})
```

The card is created **directly in `in_progress`** — there is no separate claim step. The tool returns the created card, including its number (`#N`) and id; keep the id for the rest of the session.

## Announce it

Tell the user in **one line**, e.g. `Tracking this as card #N.` Then continue the actual work. Don't over-explain.

## Rename the session (best-effort)

Rename the session so it's findable later, matching the task name:

```
/rename <task name>
```

If that command isn't supported by this Claude Code build (it does nothing or errors), don't retry — instead tell the user the inferred name and ask them to rename the session manually, e.g. *"Couldn't rename automatically — you may want to rename this session to 'Add staled-card auto-park'."* Then continue.

## Interpret the result

- **Success** — you have a card id and number. Continue to `steps/2-track-progress.md`.
- **Failure** — the tool returns a readable error result. Card creation is the **critical** step of this flow, so **stop and surface it to the user** — report the error and let them decide (retry, fix the board, or explicitly proceed without tracking). Do not silently continue untracked.
