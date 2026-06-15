# AI Rules CLI

A command-line tool that helps developers pull curated AI agent rules, skills, and workflows from a centralized repository into their projects. No more hunting through scattered rule files — get the exact rules you need for your tech stack with a simple command.

## Quick Start

```bash
# Install and configure rules for your project (one command!)
npx @quanvo99/ai-rules@latest init
```

Or use the [Web UI](https://ai-rules-setup.vercel.app/select-rules) to visually select rules and generate the CLI command.

## What Is This?

AI Rules CLI solves the problem of scattered, hard-to-find AI agent rule files across different projects. Instead of manually copying rules from various sources, you can:

- **Discover** rules, skills, and workflows for your AI agent
- **Install** only what you need for your specific project
- **Update** to the latest versions with a single command
- **Add** more content to an existing project without re-initializing

## Supported AI Agents

| Agent           | Rules | Skills | Workflows |
| --------------- | ----- | ------ | --------- |
| **Cursor**      | ✅    | ✅     | —         |
| **Claude Code** | ✅    | ✅     | —         |
| **Antigravity** | ✅    | ✅     | ✅        |
| **Windsurf**    | ✅    | —      | —         |
| **Aider**       | ✅    | —      | —         |
| **Continue**    | ✅    | —      | —         |
| **Cody**        | ✅    | —      | —         |

## Commands

### `ai-rules init`

Interactive setup wizard — or use flags for non-interactive mode:

```bash
# Interactive (prompts for everything)
ai-rules init

# Non-interactive with specific selections
ai-rules init --agent cursor --categories typescript,react-hooks --overwrite-strategy force

# With skills and workflows
ai-rules init --agent antigravity --categories all --skills tdd-design,bdd-design --workflows feature-development

# Skip certain content types
ai-rules init --agent cursor --no-skills --no-workflows
```

### `ai-rules pull`

Re-install all content tracked in `.ai-rules.json` with latest versions:

```bash
ai-rules pull
ai-rules pull --overwrite-strategy skip
```

### `ai-rules add`

Add content to an already-initialized project:

```bash
ai-rules add --categories testing,database
ai-rules add --skills test-quality-reviewer --workflows commit-plan
ai-rules add --categories all --overwrite-strategy force
```

### `ai-rules upload`

Publish a local skill directory as a **private, scoped** skill (see [Private Skills](#private-skills)). Requires the `AI_RULES_SECRET` environment variable:

```bash
AI_RULES_SECRET=… ai-rules upload ./path/to/skill-dir --agent claude-code --scope work
AI_RULES_SECRET=… ai-rules upload ./my-skill --agent cursor --scope work,client-x
```

The directory must contain a `SKILL.md`; any other files are uploaded as supporting files. The skill name is the directory's basename, and re-uploading the same `{agent, name}` replaces it.

## Private Skills

Public skills are available to everyone. **Private skills** are stored separately and only returned to callers who present a matching secret **and** scope — so you can keep team- or client-specific skills out of the public catalog while still installing them with the same CLI.

Two pieces of state unlock them, and **both** are required:

- **`AI_RULES_SECRET`** — a shared secret in your environment, sent as the `x-ai-rules-secret` header.
- **`scope`** — a tag in `.ai-rules.json`, sent as the `x-ai-rules-scope` header.

| Secret | Scope | Result |
| ------ | ----- | ------ |
| ✅ | ✅ (matching) | Public **+** scoped private skills |
| ✅ | — | Public only |
| — | ✅ | Public only (scope alone unlocks nothing) |

On any auth failure the server **silently** returns the public-only payload — there is no error and no existence leak. So if private skills don't appear after a pull, re-check the secret value and the scope rather than looking for an error.

```bash
# 1. Make the secret available (keep it out of version control)
export AI_RULES_SECRET='…'

# 2. Add a scope to .ai-rules.json (see Configuration), then pull
ai-rules pull   # now fetches public + scoped private skills
```

> Tip: ask your AI agent to run the **`setup-private-skills`** skill — it walks through the secret, scope, upload, and pull steps for you.

## Available Content

### Rule Categories

Categories include: `typescript`, `react-hooks`, `react-server-components`, `component-architecture`, `styling`, `testing`, `database`, `meta`, `url-state`, and more.

### Skills

Reusable capability packages: TDD, BDD, code refactoring, context7 integration, web search, create-PR, implementation planning, test quality review, private-skill setup, and more.

### Workflows

Step-by-step procedural guides: feature development, commit planning, code review, repo knowledge generation, structured brainstorming.

## Architecture

The system uses a **local-first** architecture:

1. **Next.js API Server** reads content from the local filesystem and caches in MongoDB
2. **CLI Tool** fetches from the API server and installs to the correct agent-specific paths
3. **Web UI** provides visual rule selection with CLI command and ChatGPT prompt generation

```
Content Repository (/rules, /skills, /workflows)
        ↓ (local filesystem)
API Server (Next.js + MongoDB cache)
        ↓ (HTTP API)
CLI Tool → installs to project
```

## Development

```bash
# Start API server
npm run dev:api

# Run CLI in dev mode
npm run dev init

# Run tests (API server must be running)
npm test

# Lint
npm run lint
```

## Configuration

The CLI creates a `.ai-rules.json` file in your project root:

```json
{
  "version": "1.0",
  "agent": "antigravity",
  "categories": ["typescript", "react-hooks"],
  "skills": ["tdd-design", "bdd-design"],
  "workflows": ["feature-development", "commit-plan"]
}
```

The optional **`scope`** field opts the project into [private skills](#private-skills). When set (and paired with `AI_RULES_SECRET`), `pull`/`add` also fetch private skills tagged with that scope:

```json
{
  "agent": "claude-code",
  "scope": "work",
  "skills": []
}
```

## Documentation

- [Repository Knowledge](./repo_knowledge/README.md) — Comprehensive codebase docs
- [System Design](./docs/system-design.md) — Detailed architecture
- [ADRs](./docs/adr/) — Architecture Decision Records
- [Manifest Schema](./docs/manifest-schema.md) — Rule manifest format
- [Rules README](./rules/README.md) — How to write rules

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Made with ❤️ for the developer community**
