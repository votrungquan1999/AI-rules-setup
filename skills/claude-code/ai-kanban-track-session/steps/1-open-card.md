# Step 1: Open (or Adopt) the Card

Get one card tracking this work — **adopt the session's existing card if there is one, otherwise create it** — then announce it.

## First: is a card already active for this session?

Tracking must be **idempotent** — one card per unit of work, even across a context compaction. Before creating anything, check whether this session already owns a card:

1. **The hook reminder.** The `UserPromptSubmit` hook injects one of two lines each turn:
   - `Active AI-Kanban card #N (<summary>). …` → a card already exists. **Adopt it** — skip creation, keep its id/number, go straight to `steps/2-track-progress.md`.
   - `No AI-Kanban card is active for this session. …` → none yet; continue below to create one.
2. **The pointer file** — the durable record that survives a compact (see below). If `~/.claude/kanban-session-state/<sessionId>.json` exists and has `cardId`/`cardNumber`, that IS your active card. Adopt it.
3. **The board itself** — see the next section. Both checks above are session-scoped, so both miss the common case: the work has a card, opened by a session that is no longer you.

Only when **all three** come up empty do you create one.

> The dispatch server is also idempotent as a backstop, but only for the *same* session id: calling `create_card` again for a session that already has a live card returns THAT card. It cannot recognise a card opened by a different session — that is what the board search is for.

## Then: does the board already have a card for this work?

A pointer is session-scoped and easily lost — a compact, a restart, a different machine, a session resumed under a new id. Every duplicate cluster this rule exists to prevent was opened by an agent that had no pointer and never looked at the board.

```
list_cards({ text: "<the distinctive words of this work>" })
```

- **It reaches finished work.** A keyword search spans every status, including `done` and `archived` — the card you want is often already closed. Do **not** pass `status` yourself; that narrows it back and hides exactly what you're looking for.
- **Phrase-quote an exact id.** `text: "\"RISE-14881\""` matches only that whole ticket id. Unquoted, `RISE-14881` also matches any card containing `rise` or `14881` on its own.
- **Results are ranked best-first**, so judge the top few rather than scanning everything.
- **Verify before adopting.** Run `get_card_context(<id>)` on the best match and read it. Same work, or just similar words?

**A follow-up is the same task.** A review fix, the next step of a plan, a second attempt after a failure, "now do X to the thing we just built" — all continue the existing card. Only genuinely different work deserves a new one.

### What to do with what you find

- **One clear match** — adopt it (next section), even if it is `done`.
- **Several plausible matches, or the only match is `archived`** — **stop and ask the user** which card to continue on. The duplicate clusters this rule exists to prevent are still on the board, so multiple matches are normal right now; guessing wrong writes your history into someone else's card.
- **No match** — create one, per the rest of this file.
- **The search errored** — that is not "no match". See *If the search itself fails* below.

### If the search itself fails

`ERR_SEARCH_UNAVAILABLE` — or any error result — means the board could not answer. It does **not** mean no card exists. Treat it as unknown:

1. Retry once **without** `text` and scan the listing yourself; a plain listing still works when search is broken.
2. If that doesn't settle it, **stop and tell the user once**: search is unavailable, so an existing card can't be ruled out. Ask whether to open a new card anyway or carry on untracked.
3. If they say tracking isn't needed, carry on untracked — and don't retry the search every turn.

Never fall through from a search error to `create_card`. That is precisely how one unit of work becomes five cards.

## Adopting a card the board already has

The card exists, but it belongs to the session that opened it. In this order:

1. **`adopt_card({ id, sessionId })`** — moves ownership to you. Without it the board still thinks the old session owns the card, so your own later `create_card` won't recognise it and will open a second one.
2. **`set_status(<id>, "in_progress")`** — a parked or finished card isn't active until you move it.
3. **`update_card({ id, … })`** — bring `description`/`nextAction` up to date with what you're actually about to do.
4. **Write the pointer file** (below) and `append_progress` one line recording that you picked this card up and why it's the same work.

If `adopt_card` or `set_status` comes back `ERR_DUPLICATE`, this session already holds an open card of its own. That's a real conflict — resolve it with the user; do not force it and do not open a third card.

## Gather the inputs (only when creating)

1. **Tags** — if you're in a repo with an `.ai-rules.json` at its root, its `scope` array is a good default. Otherwise (no such file/key, or not in a repo), **ask the user** which tags to use.
2. **Session id** — optional. If you're a session with an id (e.g. `$CLAUDE_CODE_SESSION_ID`), include it — it's what makes tracking idempotent and compact-proof. No session id → omit the field; do not stop or ask for one.
3. **Task name** — a short imperative title inferred from the work (e.g. "Add staled-card auto-park").

## Action

```
create_card({
  title: <task name>,
  description: <one-sentence goal, optional>,
  tags: <the tags gathered above>,
  sessionId: <session id, only if one exists — omit the key otherwise>,
})
```

The card is created **directly in `in_progress`** — no separate claim step. The tool returns the card (number `#N` + id); keep the id for the rest of the session.

### When the work genuinely diverges

If, later in the same session, the work splits into a **distinct task** that deserves its own card (not a continuation of the current one), call `create_card` again with `forceNew: true`. That — and only that — opens a second card for the session; then repoint the pointer file (below) at the new card.

`forceNew` is for genuine divergence, never for convenience. Do **not** reach for it because:

- a compact made you lose track — that's what the three checks above are for;
- the board search found a card you'd rather not reuse — adopt it, or ask the user;
- the match is `done` — a follow-up on finished work is still that work; adopt and reopen it;
- `adopt_card` or `set_status` returned `ERR_DUPLICATE` — that's a conflict to resolve with the user, not a reason to open a third card;
- the search errored — you don't know whether a card exists, so you can't know this is divergence.

## Write the session pointer

If a session id exists, write the pointer right after `create_card` succeeds (and rewrite it whenever `forceNew` opens a new card). This is the **memory that persists through a compaction** — downstream hooks/skills resolve the active card from it, and a resumed session re-reads it instead of assuming no card exists:

```
~/.claude/kanban-session-state/<sessionId>.json
```

```json
{ "cardId": "<created card id>", "cardNumber": <created card number>, "summary": "<task name>" }
```

Best-effort — a failed write must not block card creation; note it and move on. No session id → skip this step.

## Announce it

Tell the user in **one line** — `Tracking this as card #N.` (created) or `Continuing on card #N.` (adopted). Then get back to the work.

## Interpret the result

- **Adopted / created** — you have a card id and number. Continue to `steps/2-track-progress.md`.
- **Creation failed** — card creation is the **critical** step; **stop and surface the error** to the user (retry, fix the board, or explicitly proceed untracked). Do not silently continue untracked.
- **Search failed, user hasn't decided** — you have no card and must not invent one. Wait for their answer rather than proceeding either way.
