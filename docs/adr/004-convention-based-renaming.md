# ADR-004: Convention-Based File Renaming Strategy

## Status

Accepted

## Context

When installing rules, we need to rename files from their GitHub names to the appropriate names for each AI agent. For example:

- GitHub: `typescript-strict.md`
- Cursor: `.cursor/rules/typescript-strict.md`
- Windsurf: `.windsurf/rules/typescript.windsurfrules`

We need to decide how to handle this renaming process.

## Decision

We will use **convention-based file renaming** where the CLI follows predefined patterns for each AI agent.

## Rationale

### Convention-Based Benefits

- **Simple Implementation**: No complex configuration needed
- **Predictable**: Developers know what to expect
- **Maintainable**: Easy to understand and modify
- **Fast**: No need to look up mappings in manifests
- **Extensible**: Easy to add new agents with their conventions

### Alternative Considered: Manifest-Based Mapping

```json
{
  "files": [
    {
      "source": "typescript-strict.md",
      "cursor": ".cursor/rules/typescript-strict.md",
      "windsurf": ".windsurf/rules/typescript.windsurfrules"
    }
  ]
}
```

**Pros:**

- Flexible mapping
- Can handle complex renaming
- Explicit configuration

**Cons:**

- More complex to maintain
- Larger manifest files
- Need to update mappings for each file
- Harder to understand patterns

### Alternative Considered: User-Specified Mapping

Allow users to specify how files should be renamed.

**Pros:**

- Maximum flexibility
- User control

**Cons:**

- Complex configuration
- Hard to get right
- Poor developer experience
- Inconsistent across projects

## Naming Conventions

### Cursor

- **Directory**: `.cursor/rules/`
- **Filename**: `{category}-{subcategory}.md`
- **Examples**:
  - `typescript-strict.md`
  - `react-server-components.md`
  - `nextjs-app-router.md`

### Windsurf

- **Directory**: `.windsurf/rules/`
- **Filename**: `{category}.windsurfrules`
- **Examples**:
  - `typescript.windsurfrules`
  - `react.windsurfrules`
  - `nextjs.windsurfrules`

### Future Agents

Each agent can define its own convention:

- **Aider**: `.aider/rules/{category}.aiderrules`
- **Continue**: `.continue/rules/{category}.continue`
- **Cody**: `.cody/rules/{category}.cody`

## Implementation

### Renaming Logic

```typescript
function renameFileForAgent(sourceFile: string, agent: string, category: string): string {
  const conventions = {
    cursor: (cat: string) => `.cursor/rules/${cat}.md`,
    windsurf: (cat: string) => `.windsurf/rules/${cat}.windsurfrules`,
    aider: (cat: string) => `.aider/rules/${cat}.aiderrules`,
  }

  return conventions[agent]?.(category) || sourceFile
}
```

### Directory Creation

- Create agent-specific directories as needed
- Ensure parent directories exist before writing files
- Handle permission errors gracefully

## Consequences

### Positive

- Simple and predictable
- Easy to implement and maintain
- Consistent across projects
- Fast execution
- Easy to add new agents

### Negative

- Less flexible than manifest-based approach
- May not handle all edge cases
- Need to update conventions when adding new agents

## Edge Cases

### Multiple Files per Category

Some categories may have multiple files (e.g., `react-server-components.md`, `react-hooks.md`). In this case:

- Use the source filename as-is
- Only apply the directory convention
- Example: `react-server-components.md` → `.cursor/rules/react-server-components.md`

### Special Characters

- Handle special characters in filenames
- Ensure valid file paths for all operating systems
- Sanitize user input

### File Extensions

- Preserve original extensions for most agents
- Apply agent-specific extensions where needed
- Handle cases where extensions don't match

## Related ADRs

- ADR-003: Tool-specific folder organization
- ADR-006: Conflict detection strategy
