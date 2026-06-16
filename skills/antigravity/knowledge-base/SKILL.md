---
name: knowledge-base
description: Retrieve shared knowledge before doing non-trivial work and capture reusable knowledge after. Use before starting a non-obvious task (search the KB first), after solving a tricky problem, learning something surprising, or finding a reusable pattern, or when the user says "search the knowledge base", "capture this", "save this learning", or "remember this".
---

# Knowledge Base

A shared, scoped knowledge base reached over MCP tools. Use it to avoid re-solving solved
problems and to bank reusable knowledge for your future self and teammates.

## The Loop

1. **Retrieve before acting.** Before any non-trivial task, `kb_search` the knowledge base.
   If a canonical doc answers the problem, `kb_get` it, apply it, and cite its id.
2. **Do the work.**
3. **Capture when it's worth keeping.** After solving a non-obvious problem, learning a
   surprising fact, or building a reusable pattern, draft a note with the right tool.
   Dedup-check (search) before writing. Skip trivial / one-off things.

## The Four Capture Types

| Type | Tool | Use for |
|---|---|---|
| Question | `capture_question` | a solved problem (problem + how it was resolved) |
| TIL | `capture_til` | a surprising fact or learning worth remembering |
| Blueprint | `capture_blueprint` | a reusable pattern, template, or recipe |
| Memory | `capture_memory` | a tiny always-true project fact (loaded every session) |

Use **Memory** sparingly — it is paid in context on every turn. It is claude-code only,
materializes on `ai-rules pull` into `.claude/rules/kb-memory.md`, and the server rejects
a body over 200 characters or 2 lines.

## Drafts Need Approval

**Every capture creates a DRAFT.** A human reviewer must approve it before it surfaces in
`kb_search` or pull. Never treat what you just captured as canonical or assume it is live.

## Reference

- [retrieving.md](./reference/retrieving.md) — phrasing `kb_search`, applying and citing a found doc
- [capturing.md](./reference/capturing.md) — dedup-check first, choosing the right type, draft != canonical
- [type-guides.md](./reference/type-guides.md) — body structure for Question / TIL / Blueprint
- [memory-guide.md](./reference/memory-guide.md) — what belongs in Memory, the caps, when NOT to use it

## Setup

The MCP server runs over stdio. It needs `AI_RULES_SECRET` (and optionally `AI_RULES_API_URL`)
in its environment; the workspace scope is read from the project's `.ai-rules.json`.
