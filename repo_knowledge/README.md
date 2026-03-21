# Repository Knowledge

This folder contains comprehensive documentation about the AI Rules CLI codebase.

## Documentation

| Document | Description |
|---|---|
| [Overview](./overview.md) | Project purpose, tech stack, supported agents, content types |
| [Architecture](./architecture.md) | System design, data fetching, web UI composition, database |
| [Patterns](./patterns.md) | Code conventions, state management, search algorithm, naming |
| [Flows](./flows.md) | CLI command flows, API data flow, web UI interaction flow |
| [Testing](./testing.md) | Test infrastructure, patterns, organization |

## Reading Order

### For New Developers
1. [Overview](./overview.md) — What the project does and its tech stack
2. [Architecture](./architecture.md) — How the system is structured
3. [Patterns](./patterns.md) — Code conventions to follow
4. [Flows](./flows.md) — How data moves through the system

### For Feature Development
- **CLI features** → [Flows](./flows.md), [Patterns](./patterns.md)
- **API/server changes** → [Architecture](./architecture.md)
- **Web UI** → [Architecture](./architecture.md#web-ui-architecture), [Patterns](./patterns.md#state-management-web-ui)
- **Adding a new agent** → [Patterns](./patterns.md#agent-installation-paths), [Flows](./flows.md)
- **Testing** → [Testing](./testing.md)

## Related Documentation

- [GEMINI.md](../GEMINI.md) / [CLAUDE.md](../CLAUDE.md) — Quick reference for AI agents
- [docs/system-design.md](../docs/system-design.md) — Original system design
- [docs/adr/](../docs/adr/) — Architecture Decision Records
- [docs/manifest-schema.md](../docs/manifest-schema.md) — Manifest JSON schema
