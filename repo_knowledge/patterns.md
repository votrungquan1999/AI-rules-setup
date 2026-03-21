# Code Patterns

Key patterns and conventions specific to this repository.

**Related:** [Architecture](./architecture.md) · [Flows](./flows.md) · [Overview](./overview.md)

## File Organization

### Content Repository Structure

Each AI agent has its own subdirectory under `/rules`, `/skills`, and `/workflows`:

```
/rules/{agent}/{category}/
  manifest.json          # Category metadata, tags, file list
  rule-file.md           # Rule content
  another-rule.md

/skills/{agent}/{skill-name}/
  SKILL.md               # Entry point (required)
  scripts/               # Optional supporting files
  nodes/                 # Optional supporting files
  examples/              # Optional supporting files

/workflows/{agent}/
  workflow-name.md        # YAML frontmatter + markdown steps
```

### Agent Installation Paths

Rules, skills, and workflows are installed to different paths depending on the agent:

| Agent | Rules Path | Skills Path | Workflows Path |
|---|---|---|---|
| Cursor | `.cursor/rules/{file}` | `.cursor/skills/{name}/SKILL.md` | N/A |
| Claude Code | `.claude/rules/{file}` | `.claude/skills/{name}/SKILL.md` | N/A |
| Antigravity | `.agents/rules/{file}` | `.agents/skills/{name}/SKILL.md` | `.agents/workflows/{name}.md` |
| Windsurf | `.windsurf/rules/{file}` | N/A | N/A |
| Aider | `.aider/rules/{file}` | N/A | N/A |
| Continue | `.continue/rules/{file}` | N/A | N/A |
| Cody | `.cody/rules/{file}` | N/A | N/A |

## State Management (Web UI)

Uses `createReducerContext` (a custom factory in `src/app/hooks/createReducerContext.tsx`) to create typed React context + reducer pairs:

```typescript
const [ProviderBase, useState, useDispatch] = createReducerContext(reducer, initialState);
```

Three providers are composed in `select-rules/page.tsx`:
1. **SelectionProvider** → `useReducer` for agent, selectedIds, selectedSkillNames, selectedWorkflowNames, overwriteStrategy
2. **ManifestsProvider** → `useReducer` for manifests, skills, workflows per agent
3. **SearchProvider** → `useReducer` for query, context tokens, active question

Each exposes granular hooks (e.g., `useSelectedAgent()`, `useToggleSelection()`, `useGeneratedCommand()`).

## Database Patterns

- All document types have a `Document` suffix: `StoredRulesDocument`, `QuestionDocument`, etc.
- Collection names are constants: `RULES_DATA_COLLECTION_NAME`, `SKILLS_COLLECTION_NAME`, `QUESTIONS_COLLECTION_NAME`, `WORKFLOWS_COLLECTION_NAME`
- Database types are separated from client-facing interfaces
- Repository pattern: `findAllStoredRules()`, `storeRulesData()`, `storeSkillsData()`, `storeWorkflowsData()`

## Configuration Tracking (`.ai-rules.json`)

```json
{
  "version": "1.0",
  "agent": "antigravity",
  "categories": ["typescript", "react-hooks"],
  "skills": ["tdd-design", "bdd-design"],
  "workflows": ["feature-development", "commit-plan"]
}
```

Config helpers in `src/cli/lib/config.ts` use immutable update patterns: `addCategory()`, `addSkill()`, `addWorkflow()` return new config objects with deduplication.

## Conflict Resolution

Three strategies available via `--overwrite-strategy` flag:
- **`prompt`** (default for `init`/`add`) — Ask user per file via `promptConflictResolution()`
- **`force`** (default for `pull`) — Overwrite all existing files
- **`skip`** — Keep existing files, skip conflicts

## CLI Command Generation

`src/lib/command-generator.ts` builds safe CLI strings:
- Input sanitization via regex: `/[^a-zA-Z0-9\-_]/g` 
- Supports categories, skills, workflows, and overwrite strategy flags
- Detects "select all" scenarios and outputs `all` keyword

## ChatGPT Prompt Generation

`src/lib/prompt-generator.ts` generates a complete ChatGPT prompt from manifests, skills, and workflows. The prompt instructs ChatGPT to:
1. Ask the developer about their project
2. Select relevant categories, skills, and workflows
3. Output the exact `npx @quanvo99/ai-rules@latest init` command

## Search Algorithm

Token-based fuzzy search using Fuse.js in `src/lib/search.ts`:

1. **Tokenize query** — Split, lowercase, filter short words, remove stop words
2. **Prepare manifests** — Add tokenized description field
3. **Search per token** — Fuse.js with weighted keys (tags: 0.4, description: 0.4, category: 0.2)
4. **Aggregate scores** — Sum token match scores per manifest, normalize to 0-100

Question search (`searchQuestions`) uses same pattern but only matches on tags.

## Naming Conventions

- **Test files:** `*.test.ts` (unit), `*.e2e.test.ts` (E2E)
- **Server component files:** Standard `.tsx` suffix
- **Client component files:** Marked with `"use client"` directive at top
- **Skill entry point:** Always `SKILL.md`
- **Workflow files:** `{name}.md` with YAML frontmatter `description` field
- **API Routes:** Next.js App Router convention (`route.ts` in directory)

## Linting

Biome replaces ESLint + Prettier:
- Config in `biome.json`
- Run: `npm run lint` (check), `npm run lint:fix` (auto-fix)
- Covers formatting + linting in one tool
