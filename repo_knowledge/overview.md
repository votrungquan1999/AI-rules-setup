# Project Overview

AI Rules CLI — A command-line tool and web platform that helps developers pull curated AI agent rules, skills, and workflows from a centralized repository into their projects.

## Tech Stack

- **Runtime:** Node.js with TypeScript 5.9
- **Framework:** Next.js 16 (canary) — API server, web UI, `use cache` directive
- **Styling:** Tailwind CSS v4 with PostCSS, tw-animate-css
- **UI Components:** Radix UI primitives (checkbox, dialog, label, radio-group, select), Lucide icons
- **Linter/Formatter:** Biome (replaces ESLint/Prettier)
- **CLI:** Commander.js (arg parsing), Inquirer.js (interactive prompts), Chalk (colors)
- **Database:** MongoDB (connection via `mongodb` driver, no ORM)
- **Search:** Fuse.js (fuzzy search), Stopword (token filtering)
- **Validation:** Zod v4 (schema validation for question generation)
- **Testing:** Vitest (unit), Vitest E2E config (integration), Testing Library (React component tests)
- **Package Manager:** npm with workspaces (`cli-package/`)
- **Deployment:** Vercel (API server at `ai-rules-setup.vercel.app`)

## Supported AI Agents

| Agent | Rules | Skills | Workflows |
|---|---|---|---|
| Cursor | ✅ 10 categories | ✅ via `.cursor/skills/` | ❌ |
| Claude Code | ✅ 10 categories | ✅ 6 skills | ❌ |
| Antigravity | ✅ 9 categories | ✅ 9 skills | ✅ 5 workflows |
| Windsurf | ✅ (shared structure) | ❌ | ❌ |
| Aider | ✅ (shared structure) | ❌ | ❌ |
| Continue | ✅ (shared structure) | ❌ | ❌ |
| Cody | ✅ (shared structure) | ❌ | ❌ |

## Three Content Types

1. **Rules** — Markdown files organized by category (e.g., `typescript`, `react-hooks`, `testing`), each with a `manifest.json` describing the category, tags, and files.

2. **Skills** — Reusable capability packages with a `SKILL.md` entry file and optional supporting files (scripts, nodes, references). Examples: TDD, BDD, code refactoring, context7 integration, web search, create-PR.

3. **Workflows** — Step-by-step procedural guides as markdown with YAML frontmatter. Examples: feature development, commit planning, code review, repo knowledge generation, structured brainstorming.

## Published Package

The CLI is published as `@quanvo99/ai-rules` on npm. Users install rules via:

```bash
npx @quanvo99/ai-rules@latest init --agent cursor --categories typescript,react-hooks
```

## Key Goals

- **Local-first architecture** — API auto-primes MongoDB cache from local filesystem, eliminating GitHub API as a runtime dependency
- **Multi-agent support** — Single rule repository serves 7 different AI agents with agent-specific installation paths
- **Non-interactive mode** — Full CLI support for CI/CD and automated setups via flags
- **ChatGPT integration** — Web UI generates ChatGPT prompts for AI-assisted rule selection
