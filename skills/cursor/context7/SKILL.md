---
name: context7
description: Use Context7 MCP to fetch up-to-date library documentation and examples. Use for framework APIs, library usage patterns, and version-specific implementation guidance.
---

# Context7

Query authoritative, current library docs through Context7 before relying on generic web content.

## When to Use

- API usage for a specific library/framework.
- Version-sensitive implementation details.
- Need concrete examples from official docs.

## Workflow

1. Resolve the library identity first (Context7 resolve step).
2. Query docs with a specific question.
3. Refine query if results are too broad.
4. Apply findings to project context and patterns.

## Query Quality

- Good: "Next.js app router server action form validation example"
- Bad: "nextjs forms"

## Guardrails

- Prefer Context7 over general web search for library-specific questions.
- Keep queries concrete and scoped.
- Fall back to broader search only when Context7 coverage is insufficient.
