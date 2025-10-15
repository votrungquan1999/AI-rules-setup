# ADR-007: Config Persistence via `.ai-rules.json`

## Status

Accepted

## Context

We need to persist user preferences and installed rules between CLI runs. We need to decide:

1. What data to persist
2. Where to store it
3. What format to use
4. How to handle migrations

## Decision

We will persist configuration in a **`.ai-rules.json`** file in the project root using JSON format.

## Rationale

### JSON Config Benefits

- **Human Readable**: Easy to read and edit manually
- **Widely Supported**: JSON is universally understood
- **Simple**: No complex parsing or serialization
- **Version Control Friendly**: Easy to diff and merge
- **Familiar**: Most developers know JSON

### Alternative Considered: YAML

**Pros:**

- More human-readable
- Better for complex data structures
- Comments support

**Cons:**

- Additional dependency
- More complex parsing
- Less familiar to some developers
- Whitespace sensitive

### Alternative Considered: TOML

**Pros:**

- Good for configuration
- Human-readable
- Less verbose than JSON

**Cons:**

- Less familiar
- Additional dependency
- Limited tooling support

### Alternative Considered: No Persistence

**Pros:**

- Simplest implementation
- No state management

**Cons:**

- Poor user experience
- Can't track installed rules
- No preferences storage
- Hard to implement update command

## Config Schema

### Basic Structure

```json
{
  "version": "1.0.0",
  "agent": "cursor",
  "rules": [
    {
      "id": "typescript-strict",
      "category": "typescript",
      "installedAt": "2024-01-15T10:30:00Z",
      "source": "github.com/org/ai-rules",
      "files": [
        {
          "source": "typescript-strict.md",
          "target": ".cursor/rules/typescript-strict.md"
        }
      ]
    }
  ],
  "preferences": {
    "autoUpdate": false,
    "conflictResolution": "prompt",
    "defaultAgent": "cursor"
  }
}
```

### Rule Entry Schema

```typescript
interface RuleEntry {
  id: string // Unique identifier
  category: string // Rule category
  installedAt: string // ISO timestamp
  source: string // Source repository
  files: FileMapping[] // File mappings
}

interface FileMapping {
  source: string // Source filename
  target: string // Target file path
}
```

## Implementation

### Config Manager

```typescript
class ConfigManager {
  private configPath: string

  constructor(projectRoot: string) {
    this.configPath = path.join(projectRoot, '.ai-rules.json')
  }

  async load(): Promise<Config> {
    if (!fs.existsSync(this.configPath)) {
      return this.getDefaultConfig()
    }

    const content = await fs.readFile(this.configPath, 'utf8')
    return JSON.parse(content)
  }

  async save(config: Config): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
  }
}
```

### Default Config

```typescript
function getDefaultConfig(): Config {
  return {
    version: '1.0.0',
    agent: null,
    rules: [],
    preferences: {
      autoUpdate: false,
      conflictResolution: 'prompt',
      defaultAgent: null,
    },
  }
}
```

## Consequences

### Positive

- Simple to implement
- Easy to debug
- Human-readable
- Version control friendly
- No external dependencies

### Negative

- No schema validation by default
- Manual migration handling
- No built-in encryption
- JSON limitations (no comments)

## Migration Strategy

### Version Field

Use a version field to handle schema changes:

```json
{
  "version": "1.0.0"
  // ... rest of config
}
```

### Migration Logic

```typescript
function migrateConfig(config: any): Config {
  switch (config.version) {
    case '1.0.0':
      return config // Already current
    case undefined:
      return migrateFromV0ToV1(config)
    default:
      throw new Error(`Unsupported config version: ${config.version}`)
  }
}
```

### Backward Compatibility

- Always support reading older versions
- Provide clear error messages for unsupported versions
- Suggest upgrade path

## Error Handling

### Invalid JSON

```typescript
try {
  const config = JSON.parse(content)
} catch (error) {
  console.error('Invalid JSON in .ai-rules.json')
  console.error('Please fix the file or delete it to start fresh')
  process.exit(1)
}
```

### Missing Fields

```typescript
function validateConfig(config: any): Config {
  return {
    version: config.version || '1.0.0',
    agent: config.agent || null,
    rules: config.rules || [],
    preferences: {
      autoUpdate: config.preferences?.autoUpdate ?? false,
      conflictResolution: config.preferences?.conflictResolution ?? 'prompt',
      defaultAgent: config.preferences?.defaultAgent ?? null,
    },
  }
}
```

### Permission Errors

- Handle read/write permission errors
- Suggest checking file permissions
- Provide helpful error messages

## File Location

### Project Root

Store `.ai-rules.json` in the project root (same level as `package.json`).

**Benefits:**

- Easy to find
- Version control friendly
- Clear project ownership

**Alternative Considered: User Home**

- `~/.ai-rules/config.json`
- Global configuration
- Not project-specific

## Related ADRs

- ADR-002: Monorepo structure
- ADR-005: Always-fetch-latest strategy
