# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Comprehensive Documentation

**For detailed architecture and flows, see [`/repo_knowledge/`](./repo_knowledge/README.md)**

The repo_knowledge folder contains comprehensive documentation about:
- [CLI Flows](./repo_knowledge/cli-flows.md) - Command flows and operations
- [API Architecture](./repo_knowledge/api-architecture.md) - Server and caching
- [Rule System](./repo_knowledge/rule-system.md) - Rule organization
- [Question System](./repo_knowledge/question-system.md) - Question generation
- [Database Patterns](./repo_knowledge/database-patterns.md) - MongoDB operations
- [Search & Selection](./repo_knowledge/search-selection.md) - Search algorithm
- [Data Types](./repo_knowledge/data-types.md) - Type definitions
- [Web UI](./repo_knowledge/web-ui.md) - Web interface architecture

## Project Overview

AI Rules CLI is a command-line tool that helps developers pull curated AI agent rules from a centralized repository into their projects. The system consists of:
- **Next.js API Server** (`src/app/`) - Caches GitHub repository content and provides centralized rule management
- **CLI Tool** (`src/cli/`) - Handles user interaction, file operations, and rule installation
- **Rules Repository** (`/rules`) - Collection of curated AI agent rules organized by agent and category
- **Optional Web UI** - For visual rule selection and configuration

## Development Commands

### Running the Application
```bash
# Start API server (required for development)
npm run dev:api

# Run CLI in development mode (in separate terminal)
npm run dev:cli init

# Start web UI with database
docker-compose up -d
```

### Building
```bash
# Build CLI
npm run build

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
# Check code
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
This is a monorepo with both CLI and rules in the same repository. The structure follows ADR-002:

```
/src
  /app         # Next.js API server (pages, API routes, web UI)
  /cli         # CLI tool (commands, lib utilities)
  /components  # Shared React components
  /lib         # Shared utilities
  /server      # Server-side utilities (database, repositories)
/rules         # Rule files organized by AI agent
/docs          # Architecture decision records and design docs
```

### Two-Tier Architecture
- **API Server** fetches rules from GitHub, caches for 5 minutes, and serves to CLI
- **CLI** consumes API, manages local file operations, and handles user interaction
- This reduces GitHub API rate limiting and provides centralized management

### Data Flow
1. CLI requests rules from API server
2. API server fetches from GitHub (or returns cached data)
3. CLI writes rules to appropriate agent directories (`.cursor/rules/`, `.windsurf/rules/`)
4. Configuration stored in `.ai-rules.json` at project root

## Key Architectural Patterns

### Client/Server Component Separation (Next.js)
- **Server Components**: Handle data fetching, static content, composition
- **Client Components**: Handle interactivity, state, browser APIs
- Server components compose content, client components handle interactions
- Pass complete elements as `children`, don't recreate in client components

### Database Patterns
- All database document types MUST have "Document" suffix (e.g., `ProductDocument`)
- Always separate database types from client-facing interfaces
- Convert database documents to client interfaces when returning data
- Never expose raw database documents to client components

### File Organization
- Tool-specific folders: `/rules/cursor/`, `/rules/windsurf/`
- Convention-based renaming: Files renamed to match AI agent conventions
- Each category has a `manifest.json` describing available rules

## Important Rules and Guidelines

### Meta Rules (ALWAYS APPLY)
- Keep files under **300 lines** for AI context management
- NEVER run `npm run build` or `npm run dev` after completing tasks
- ALWAYS use `npm install` to install packages (never edit package.json directly)
- NEVER implement unused/future features not explicitly requested
- Ask 1-2 clarifying questions before implementing (more if explanation >100 chars)
- NEVER use defensive try-catch blocks around every operation (only at intentional error boundaries)

### Rule File Management
- When changing rule files for one AI agent, update corresponding files for other agents
- When changing rule content, update the manifest.json file as well
- Cursor rule files MUST be strictly less than 200 lines (preferably ~150 lines)
- Use `/rules.md` as master rule file and follow it for all user requests

### Testing
- NEVER run tests automatically - user will run them and provide output
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
- `/.cursor/rules/` - Development rules for AI agents
- `/rules/README.md` - Rule file guidelines

## Key Files

### CLI Entry Points
- `src/cli/index.ts` - Main CLI entry point
- `src/cli/commands/init.ts` - Interactive setup wizard
- `src/cli/commands/generate-questions.ts` - Question generation for rule refinement

### Server Components
- `src/server/database.ts` - MongoDB connection and utilities
- `src/server/rules-repository.ts` - Rule fetching and caching
- `src/server/questions-repository.ts` - Question management

### API Routes
- `src/app/api/rules/route.ts` - Rules API endpoint
- `src/app/api/lib/github-fetcher.ts` - GitHub API integration

### Configuration
- `vitest.config.ts` - Test configuration (60s timeout, single fork)
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
