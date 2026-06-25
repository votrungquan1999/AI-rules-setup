# Capturing

How to bank knowledge after solving something worth keeping.

## 1. Dedup-check first

Before drafting anything, `npx @quanvo99/ai-rules@latest kb search` for it. If a canonical entry already covers it,
don't create a near-duplicate — apply and cite the existing one instead. Capture only when the
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

| Command | Inputs |
|---|---|
| `npx @quanvo99/ai-rules@latest kb capture question` | `--title`, `--problem`/`--problem-file`, `--resolution`/`--resolution-file` |
| `npx @quanvo99/ai-rules@latest kb capture til` | `--title`, body via `--file` / `--body` / stdin |
| `npx @quanvo99/ai-rules@latest kb capture blueprint` | `--title`, body via `--file` / `--body` / stdin |
| `npx @quanvo99/ai-rules@latest kb capture memory` | optional `--title`, body via `--file` / `--body` / stdin (≤ 200 chars AND ≤ 2 lines) |

Each prints the created draft's id. **For multi-line markdown, write the content to a temp file
and pass `--file` / `--problem-file` / `--resolution-file`** rather than quoting it inline.

## 4. Draft != canonical

**Every capture is a draft pending human review.** It will NOT appear in `npx @quanvo99/ai-rules@latest kb search`
or be delivered on pull until a reviewer approves it. After capturing, keep working with your
own knowledge — never assume the captured note is live or authoritative yet.
