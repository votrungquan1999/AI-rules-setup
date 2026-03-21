# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comprehensive Documentation

**For detailed architecture and flows, see [`/repo_knowledge/`](./repo_knowledge/README.md)**

The repo_knowledge folder contains comprehensive documentation about:
- [Overview](./repo_knowledge/overview.md) - Project purpose, tech stack, supported agents
- [Architecture](./repo_knowledge/architecture.md) - System design, data fetching, web UI
- [Patterns](./repo_knowledge/patterns.md) - Code conventions, state management, search
- [Flows](./repo_knowledge/flows.md) - CLI command flows, API data flow
- [Testing](./repo_knowledge/testing.md) - Test infrastructure and patterns

## Project Overview

AI Rules CLI is a command-line tool that helps developers pull curated AI agent rules, skills, and workflows from a centralized repository into their projects. The system consists of:
- **Next.js API Server** (`src/app/`) - Caches content in MongoDB with local filesystem auto-priming
- **CLI Tool** (`src/cli/`) - Handles user interaction, file operations, and content installation
- **Rules Repository** (`/rules`) - Curated AI agent rules organized by agent and category
- **Skills Repository** (`/skills`) - Reusable capability packages (e.g., TDD, BDD, code refactoring)
- **Workflows Repository** (`/workflows`) - Step-by-step procedural guides (e.g., feature development, commit planning)
- **Web UI** (`/select-rules`) - Visual rule selection with CLI command and ChatGPT prompt generation

## Development Commands

### Running the Application
```bash
# Start API server (required for development)
npm run dev:api

# Run CLI in development mode (in separate terminal)
npm run dev init

# Start web UI with database
docker-compose up -d
```

### Building
```bash
# Build API server
npm run build:api

# Build CLI for publishing
npm run build:cli
```

### Testing
```bash
# Run tests (API server must be running)
npm test

# Run specific test file
npx vitest run tests/path/to/test.ts

# Run E2E tests
npm run test:e2e -- tests/e2e/test-name.test.ts
```

> **IMPORTANT:** Always run tests without watch mode in agent terminals. Watch mode hangs in non-interactive shells. Use `npx vitest run` instead of `npx vitest`.

### Linting
```bash
# Check code (Biome)
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Question Generation
```bash
# Generate questions for rule refinement
npm run generate-questions
```

## Architecture

### Monorepo Structure
This is a monorepo with both CLI and rules in the same repository:

```
/src
  /app         # Next.js API server (pages, API routes, web UI)
  /cli         # CLI tool (commands, lib utilities)
  /components  # React UI components
  /hooks       # Custom React hooks
  /lib         # Shared client/server logic (search, state, generators)
  /server      # Server-side utilities (database, repositories)
/rules         # Rule files organized by AI agent
/skills        # Skill packages organized by AI agent
/workflows     # Workflow files organized by AI agent
/cli-package   # Published npm package workspace
/docs          # Architecture decision records and design docs
```

### Local-First Architecture
- **API Server** reads rules from local filesystem, caches in MongoDB, serves to CLI
- **CLI** consumes API, manages local file operations, handles user interaction
- MongoDB cache auto-primes from filesystem when empty (no GitHub dependency at runtime)

### Data Flow
1. CLI requests rules/skills/workflows from API server
2. API server returns cached data (auto-primes from local filesystem if cache empty)
3. CLI writes rules to agent directories, skills to skill paths, workflows to `.agents/workflows/`
4. Configuration stored in `.ai-rules.json` at project root

## Key Architectural Patterns

### Client/Server Component Separation (Next.js)
- **Server Components**: Handle data fetching, static content, composition
- **Client Components**: Handle interactivity, state, browser APIs
- Server components compose content, client components handle interactions
- Pass complete elements as `children`, don't recreate in client components

### Database Patterns
- All database document types MUST have "Document" suffix (e.g., `StoredRulesDocument`)
- Always separate database types from client-facing interfaces
- Convert database documents to client interfaces when returning data
- Never expose raw database documents to client components

### File Organization
- Rules per agent: `/rules/cursor/`, `/rules/claude-code/`, `/rules/antigravity/`
- Skills: `/skills/antigravity/`, `/skills/claude-code/`
- Workflows: `/workflows/antigravity/`
- Each category has a `manifest.json` describing available rules

## Important Rules and Guidelines

### Meta Rules (ALWAYS APPLY)
- Keep files under **300 lines** for AI context management
- NEVER run `npm run build` or `npm run dev` after completing tasks
- ALWAYS use `npm install` to install packages (never edit package.json directly)
- NEVER implement unused/future features not explicitly requested
- Ask 1-2 clarifying questions before implementing (more if explanation >100 chars)
- NEVER use defensive try-catch blocks around every operation (only at intentional error boundaries)
- Only extract reusable components/functions when the same logic is repeated at least **3 times**

### Rule File Management
- When changing rule files for one AI agent, update corresponding files for other agents
- When changing rule content, update the manifest.json file as well
- Cursor rule files MUST be strictly less than 200 lines (preferably ~150 lines)


### Testing
- Run tests automatically to verify changes when appropriate
- Tests run against real Next.js API server
- Start API server before running tests: `npm run dev:api` then `npm test`
- **ALWAYS run tests without watch mode in agent terminals** (watch mode hangs in non-interactive shells)

### Planning Mode
- When `plan.md` already exists and user requests changes, ALWAYS create a NEW file
- NEVER modify existing `plan.md` when changes are requested

## Environment Variables

See `.env.example` for required environment variables:
- MongoDB connection string (optional for local development)
- GitHub API tokens (for fetching rules)
- API server configuration

## Documentation

- `/docs/system-design.md` - Detailed system architecture
- `/docs/adr/` - Architecture Decision Records
- `/docs/roadmap.md` - Project roadmap
- `/docs/manifest-schema.md` - Manifest JSON schema
- `/rules/README.md` - Rule file guidelines


