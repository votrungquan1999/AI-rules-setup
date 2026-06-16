# Retrieving

How to find and apply existing knowledge before doing work.

## When to search

Search **before** any non-trivial task: a tricky bug, an unfamiliar area, a decision that
might already be settled, a pattern you suspect exists. Skip it only for truly trivial edits.

## Phrasing `kb_search`

`kb_search { query, type? }` ranks canonical docs whose scope intersects the workspace.

- **Query with the problem's nouns and symptoms**, not a full sentence. Good:
  `"flaky e2e mongo connection reset"`. Weak: `"how do I fix my test"`.
- Search is keyword/relevance ranked — include the specific error text, API name, or
  domain term you actually care about.
- **Narrow by `type`** when you know the shape you want:
  `kb_search { query: "...", type: "blueprint" }` for a reusable recipe,
  `"question"` for a solved problem, `"til"` for a fact, `"memory"` for an always-on fact.
- If the first query returns nothing useful, **re-query with different terms** (synonyms,
  the underlying cause instead of the symptom) before concluding the KB has nothing.

## Reading a hit

`kb_search` returns ranked `[{ doc, score }]` with each doc's id. To read the full body,
call `kb_get { id }`.

## Applying and citing

When a canonical doc answers the problem:

1. Apply its guidance to the work.
2. **Cite the id** in your explanation, e.g. "Applying KB doc `<id>` (Blueprint: …)".
   Citing makes it traceable and signals the KB is being used, so stale or wrong docs
   get noticed and fixed.

Only canonical docs are ever returned — drafts are invisible until a reviewer approves them.
