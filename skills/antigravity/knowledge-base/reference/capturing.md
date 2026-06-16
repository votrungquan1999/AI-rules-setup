# Capturing

How to bank knowledge after solving something worth keeping.

## 1. Dedup-check first

Before drafting anything, `kb_search` for it. If a canonical doc already covers it, don't
create a near-duplicate — apply and cite the existing one instead. Capture only when the
knowledge is genuinely new (or meaningfully extends what exists).

## 2. Is it worth keeping?

Capture when the work produced something **reusable or non-obvious**:

- A solved problem whose fix wasn't obvious → **Question**.
- A surprising fact or gotcha you'd want to know again → **TIL**.
- A pattern, template, or recipe you'd reuse → **Blueprint**.
- A tiny always-true project fact every session must know → **Memory** (use sparingly).

Do NOT capture trivial, one-off, or obvious things — they only add review noise and dilute
search results. When in doubt, lean toward not capturing.

## 3. Choose the right type

See [type-guides.md](./type-guides.md) for the body structure of Question / TIL / Blueprint,
and [memory-guide.md](./memory-guide.md) for Memory.

| Tool | Args |
|---|---|
| `capture_question` | `{ title, problem, resolution, agent? }` — server composes the body |
| `capture_til` | `{ title, body, agent? }` |
| `capture_blueprint` | `{ title, body, agent? }` |
| `capture_memory` | `{ body, title?, agent? }` — body ≤ 200 chars AND ≤ 2 lines |

Each returns `{ id }`.

## 4. Draft != canonical

**Every capture is a draft pending human review.** It will NOT appear in `kb_search` or be
delivered on pull until a reviewer approves it. After capturing, keep working with your own
knowledge — never assume the captured note is live or authoritative yet.
