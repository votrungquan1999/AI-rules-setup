---
name: repo-knowledge
description: Build concise repository knowledge docs by mapping architecture, patterns, flows, and development workflow. Use when onboarding, documenting an unfamiliar repo, or preparing long-running feature work.
---

# Repository Knowledge

Create durable repo documentation that helps future tasks start with strong context.

## When to Use

- New repository onboarding.
- User asks for architecture/pattern documentation.
- Before major refactors or multi-file initiatives.

## Workflow

1. Explore repository structure and key entry points.
2. Identify core subsystems:
   - Runtime/framework
   - Data/storage
   - API or UI architecture
   - Testing strategy
3. Capture real project commands from dependency and script files.
4. Create concise docs under `repo_knowledge/` (only files that matter):
   - `overview.md`
   - `architecture.md`
   - `patterns.md`
   - `flows.md`
   - `testing.md`
5. Cross-link docs to avoid duplication.
6. If project agent guidance file exists, add links to the new docs.

## Quality Bar

- Document repo-specific behavior, not generic best practices.
- Use concrete examples and file references.
- Keep docs maintainable and under control (no encyclopedic dumps).

## Guardrails

- Do not include secrets or credential material.
- Do not fabricate missing architecture details.
- Prefer "known/unknown" notes when evidence is incomplete.
