# Repository Knowledge

This folder contains comprehensive documentation about the AI Rules CLI codebase architecture, flows, and patterns.

## Documentation Structure

The documentation is organized into interconnected files that reference each other to avoid duplication:

### Core System Documentation

1. **[CLI Flows](./cli-flows.md)** - Command-line interface flows and operations
   - `ai-rules init` command flow (rules, skills, workflows)
   - `ai-rules pull` command flow
   - File operations and naming conventions
   - Configuration management
   - Interactive prompts (categories, skills, workflows)

2. **[API Architecture](./api-architecture.md)** - Next.js API server and caching
   - Three-tier caching strategy
   - GitHub fetcher integration
   - Data transformation
   - Performance optimizations

3. **[Rule System](./rule-system.md)** - Rule organization and structure
   - Repository structure
   - Manifest format
   - File naming conventions
   - Dependencies and conflicts

4. **[Question System](./question-system.md)** - Question generation and refinement
   - Ollama LLM integration
   - Question types (yes-no, choice, open-ended)
   - Prompt engineering
   - Question workflow

5. **[Database Patterns](./database-patterns.md)** - MongoDB operations and repositories
   - Connection management
   - Document type naming conventions
   - Rules and questions repositories
   - Data conversion patterns

6. **[Search & Selection](./search-selection.md)** - Search algorithm and state management
   - Multi-token fuzzy search
   - Context enrichment from answers
   - Selection state management
   - Command generation

7. **[Data Types](./data-types.md)** - Type definitions and interfaces
   - Core types (Manifest, Config, RulesData/RulesResponse)
   - CLI types (AIAgent, ToolConventions)
   - Server types (RuleFile, RuleCategory)
   - Question types (Question union, QuestionAnswer)
   - Database document types

8. **[Web UI](./web-ui.md)** - Web UI architecture and flows
   - Server/client component separation
   - Layout structure
   - State management with context providers
   - Command generation flow

9. **[Skills & Workflows](./skills-workflows.md)** - Skills and workflows system
   - Repository structure for skills and workflows
   - API response format
   - Per-agent installation paths
   - Config tracking and CLI flags

## How to Use This Documentation

### For New Developers

Start with this reading order:

1. [Rule System](./rule-system.md) - Understand what the system manages
2. [Skills & Workflows](./skills-workflows.md) - Understand skills and workflows
3. [CLI Flows](./cli-flows.md) - Learn how users interact with the CLI
4. [API Architecture](./api-architecture.md) - Understand the backend
5. [Data Types](./data-types.md) - Reference for all type definitions

### For Feature Development

Refer to specific documentation based on what you're building:

- **CLI features** → [CLI Flows](./cli-flows.md), [Data Types](./data-types.md)
- **Skills/workflows** → [Skills & Workflows](./skills-workflows.md), [CLI Flows](./cli-flows.md)
- **API endpoints** → [API Architecture](./api-architecture.md), [Database Patterns](./database-patterns.md)
- **Search features** → [Search & Selection](./search-selection.md), [Question System](./question-system.md)
- **Web UI features** → [Web UI](./web-ui.md), [Search & Selection](./search-selection.md)
- **Database operations** → [Database Patterns](./database-patterns.md), [Data Types](./data-types.md)

### For Understanding Flows

Each document includes flow diagrams and examples:

- **CLI installation flow** → [CLI Flows](./cli-flows.md)
- **API data flow** → [API Architecture](./api-architecture.md)
- **Question generation flow** → [Question System](./question-system.md)
- **Search refinement flow** → [Search & Selection](./search-selection.md)
- **Command generation flow** → [Web UI](./web-ui.md)

## Cross-References

Documents reference each other using relative links. Follow these links to explore related topics:

```
CLI Flows ←→ API Architecture ←→ Database Patterns
    ↓              ↓                    ↓
Data Types ←→ Rule System ←→ Question System
    ↓              ↓                    ↓
Web UI ←→ Search & Selection ←→ Question System
    ↓
Skills & Workflows ←→ CLI Flows ←→ Data Types
```

## Maintenance

When updating the codebase:

1. **Update relevant documentation** when changing architecture or flows
2. **Add cross-references** when creating connections between systems
3. **Keep examples current** with actual code implementations
4. **Update diagrams** when data flows change

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Quick reference for Claude Code
- [docs/system-design.md](../docs/system-design.md) - Original system design
- [docs/adr/](../docs/adr/) - Architecture Decision Records
- [.cursor/rules/](../.cursor/rules/) - Development rules for AI agents
