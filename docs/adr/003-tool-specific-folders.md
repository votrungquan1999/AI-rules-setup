# ADR-003: Tool-Specific Folder Organization in GitHub

## Status

Accepted

## Context

We need to organize the rules repository to support multiple AI agents (Cursor, Windsurf, Aider, etc.). Each agent may have different:

- File naming conventions
- Directory structures
- Content formats
- Output locations

We need to decide how to structure the `/rules` directory to accommodate these differences.

## Decision

We will organize rules by **AI agent first, then by category**.

## Rationale

### Tool-First Organization Benefits

- **Clear Separation**: Each agent's rules are isolated
- **Agent-Specific Conventions**: Can follow each tool's preferred structure
- **Easy Maintenance**: Rules for each agent can be maintained independently
- **Scalable**: Easy to add new agents without restructuring
- **Tool-Specific Metadata**: Each agent can have different manifest schemas

### Alternative Considered: Category-First Organization

```
/rules
  /typescript
    /cursor
    /windsurf
  /react
    /cursor
    /windsurf
```

**Pros:**

- Rules grouped by technology
- Easier to see all rules for a technology
- Natural for developers thinking by tech stack

**Cons:**

- Harder to maintain agent-specific conventions
- More complex to add new agents
- Rules may be duplicated across agents
- Harder to understand agent-specific requirements

### Alternative Considered: Flat Structure

```
/rules
  typescript-cursor.md
  typescript-windsurf.md
  react-cursor.md
```

**Pros:**

- Simple structure
- Easy to find files

**Cons:**

- Doesn't scale well
- Hard to organize metadata
- No clear grouping
- Hard to maintain

## Repository Structure

```
/rules
  /cursor
    /typescript
      manifest.json
      rules.md
      README.md
    /react
      manifest.json
      react-server-components.md
      react-hooks.md
      README.md
    /nextjs
      manifest.json
      app-router.md
      pages-router.md
      README.md
  /windsurf
    /typescript
      manifest.json
      rules.md
      README.md
    /react
      manifest.json
      rules.md
      README.md
  /aider
    (future)
  README.md
```

## Consequences

### Positive

- Each agent can have its own conventions
- Easy to add new agents
- Clear ownership of rules per agent
- Can evolve agent-specific features independently
- Natural for CLI to discover rules by agent

### Negative

- Potential duplication of similar rules across agents
- More complex to find all rules for a technology
- Need to maintain consistency across agents

## Implementation Notes

- Each agent folder should have a README explaining its conventions
- Manifest files should include agent-specific metadata
- CLI should discover available agents by scanning `/rules` directory
- Consider symlinks for truly identical rules across agents

## Agent-Specific Conventions

### Cursor

- Files: `.cursor/rules/*.md`
- Naming: `{category}-{subcategory}.md`
- Format: Markdown with specific sections

### Windsurf

- Files: `.windsurf/rules/*.md`
- Naming: `{category}.windsurfrules`
- Format: Windsurf-specific format

### Future Agents

- Each can define its own conventions
- CLI will adapt to each agent's requirements

## Related ADRs

- ADR-002: Monorepo structure
- ADR-004: Convention-based file renaming
