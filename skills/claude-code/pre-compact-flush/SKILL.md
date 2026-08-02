---
name: pre-compact-flush
description: Writes everything durable-worthy out of the current context into the task workspace and the AI-Kanban card, so a compaction cannot lose it — then tells the operator it is safe to run /compact. Trigger when the user types "/pre-compact-flush", says "flush before compacting", "I'm about to compact", "save context before /compact", or asks to preserve the session's state before it gets summarized.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__ai-kanban-dispatch__append_decision, mcp__ai-kanban-dispatch__append_progress, mcp__ai-kanban-dispatch__mark_decision_outdated, mcp__ai-kanban-dispatch__get_card_context
---

# Pre-Compact Flush

You are about to lose your working memory. A compaction replaces this conversation with a model-written summary — and a summary keeps what reads as *important*, not what is *expensive to reconstruct*. Those are different sets. Your job here is to write the second set to disk before the first set is all that's left.

You cannot run `/compact` yourself. You prepare; the operator compacts.

## The selection test

Write it down if **re-deriving it would cost more than reading it**. That single test decides everything below.

**Write:**

- A **decision** and the alternative it beat. The code records the choice and never the rejected option — that half is gone forever if you don't write it.
- A decision that was **later overturned**, plus what replaced it. This is the highest-value entry and the easiest to lose: a summary that keeps the original and drops the reversal leaves a confidently-wrong record behind.
- An **open question** you have not resolved. These vanish silently — nothing else in the repo knows they were ever asked.
- A **finding that cost real effort** — a fact you verified, an assumption you refuted, a claim that turned out false.
- A **command or query** that took several attempts to get right.

**Don't write:**

- Which files you edited — `git status` and the diff already say so.
- What the code does — the code says so.
- A narrative of the conversation. You are writing records, not minutes.

When you're unsure, ask whether a competent person with the repo in front of them could work it out. If yes, skip it.

## Where each thing goes

Each type has exactly one home. Never write the same thing to two of them.

- **Decision** → append to `<ws>/DECISIONS.md` **and** call `append_decision` on the active card. Both, because the workspace can be deleted and the card cannot.
- **Step transition / status change** → append to `<ws>/IMPLEMENTATION_PROGRESS.md`.
- **Open question, finding, or reusable command** → append to `<ws>/JOURNAL.md`.
- **A decision that is now superseded** → call `mark_decision_outdated` on the card and note the supersession in `DECISIONS.md`. Do not delete the old entry; a decision that was reversed is itself a record.

`<ws>` is the task workspace you have been writing to this session — the folder holding `IMPLEMENTATION_PROGRESS.md` and any plan files. If you can't identify it, don't guess a path: see *No workspace* below.

## Flow

1. **Locate `<ws>`.** It's the folder you've written progress to this session. Confirm it exists before writing.
2. **Scan your own context** against the selection test. Go back to the start of what you can still see, not just the last few turns — the oldest entries are the ones a summary has already thinned.
3. **Append** each item to its home. Always append; never rewrite or reflow an existing file, and never renumber existing entries.
4. **Mirror decisions to the card**, including any supersessions.
5. **Report and hand off** (below).

## No workspace

A session with no task workspace still has things worth keeping. Write them to the **card alone** via `append_progress` and `append_decision` — that path needs no `<ws>` and is the more durable of the two anyway.

If there is no workspace *and* no card, say so plainly and ask whether to open a card before compacting. Don't invent a folder to write into.

## Finish

Report what you wrote: the counts per file, and one line naming each decision recorded. Then state explicitly that **the operator can now run `/compact`** — you cannot trigger it.

Name anything you deliberately left out, and anything you were unsure whether to keep. An entry you skipped is fine; an entry you skipped *silently* is the failure this skill exists to prevent.
