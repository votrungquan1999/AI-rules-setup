---
name: knowledge-base
description: Retrieve shared knowledge before doing non-trivial work and capture reusable knowledge after. Use before starting a non-obvious task (search the KB first), after solving a tricky problem, learning something surprising, or finding a reusable pattern, or when the user says "search the knowledge base", "capture this", "save this learning", or "remember this".
---

# Knowledge Base

A shared, scoped knowledge base reached through the `ai-rules kb` CLI command. Use it to avoid
re-solving solved problems and to bank reusable knowledge for your future self and teammates.

## The Loop

1. **Retrieve before acting.** Before any non-trivial task, run `ai-rules kb search "<query>"`.
   If a canonical entry answers the problem, `ai-rules kb get <id>`, apply it, and cite its id.
2. **Do the work.**
3. **Capture when it's worth keeping.** After solving a non-obvious problem, learning a
   surprising fact, or building a reusable pattern, draft a note with the right command.
   Dedup-check (search) before writing. Skip trivial / one-off things.

## The Four Capture Types

| Type | Command | Use for |
|---|---|---|
| Question | `ai-rules kb capture question` | a solved problem (problem + how it was resolved) |
| TIL | `ai-rules kb capture til` | a surprising fact or learning worth remembering |
| Blueprint | `ai-rules kb capture blueprint` | a reusable pattern, template, or recipe |
| Memory | `ai-rules kb capture memory` | a tiny always-true project fact (loaded every session) |

Use **Memory** sparingly — it is paid in context on every turn. It is claude-code only,
materializes on `ai-rules pull` into `.claude/rules/kb-memory.md`, and the command rejects
a body over 200 characters or 2 lines.

## Passing note bodies

For anything multi-line (a Question's problem/resolution, a Blueprint body), **write the
content to a temp file and pass it with `--file` / `--problem-file` / `--resolution-file`** —
quoting multi-line markdown on the shell is fragile. Short, single-line bodies can use the
inline `--body` / `--problem` / `--resolution` flags, or pipe via stdin.

## Drafts Need Approval

**Every capture creates a DRAFT.** A human reviewer must approve it before it surfaces in
`ai-rules kb search` or on pull. Never treat what you just captured as canonical or assume it
is live.

## Reference

- [retrieving.md](./reference/retrieving.md) — phrasing `kb search`, applying and citing a found entry
- [capturing.md](./reference/capturing.md) — dedup-check first, choosing the right type, draft != canonical
- [type-guides.md](./reference/type-guides.md) — body structure for Question / TIL / Blueprint
- [memory-guide.md](./reference/memory-guide.md) — what belongs in Memory, the caps, when NOT to use it

## Setup

The `ai-rules` CLI must be installed and `AI_RULES_SECRET` set in the environment (optionally
`AI_RULES_API_URL`). The workspace scope is read from the project's `.ai-rules.json` — captures
require at least one `scope` tag there.
