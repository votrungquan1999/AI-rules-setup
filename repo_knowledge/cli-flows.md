# CLI Command Flows

This document describes the CLI command flows and operations.

**Related Documentation:**
- [API Architecture](./api-architecture.md) - How CLI fetches data from API
- [Rule System](./rule-system.md) - Rule structure and file organization
- [Data Types](./data-types.md) - CLI type definitions

## Main Entry Point

**File:** `src/cli/index.ts`

The CLI is built with Commander.js and provides interactive rule installation.

## `ai-rules init` Command

**Location:** `src/cli/commands/init.ts`

### Command Flow

```
1. Agent Selection
   ├─ Check --agent flag
   ├─ Fetch available agents from API
   └─ Prompt user if not provided (cursor, windsurf, aider, continue, cody)

2. Category Selection
   ├─ Check --categories flag (comma-separated IDs or "all")
   ├─ Fetch manifests for selected agent
   └─ Interactive checkbox selection with previews
      ├─ Display: ID, tags, description, file count
      └─ Show dependencies and conflicts

3. Load/Create Configuration
   ├─ Load existing .ai-rules.json
   └─ Create default if missing

4. Conflict Detection & Resolution
   ├─ Check --overwrite-strategy flag: "prompt" | "force" | "skip"
   ├─ For each selected category:
   │  └─ Check file existence
   └─ Handle per strategy:
      ├─ "prompt": Ask user for each conflict
      ├─ "force": Overwrite all
      └─ "skip": Keep existing

5. File Installation
   ├─ For each manifest file:
   │  ├─ Fetch content from API
   │  ├─ Apply naming convention (.{agent}/rules/{filename})
   │  ├─ Create directories
   │  └─ Write file
   └─ Log each installation

6. Config Update
   ├─ Add installed categories to config
   └─ Save .ai-rules.json
```

### Example Commands

```bash
# Interactive mode (prompts for all options)
ai-rules init

# With agent specified
ai-rules init --agent cursor

# With categories specified
ai-rules init --agent cursor --categories typescript,react

# Install all categories without prompts
ai-rules init --agent cursor --categories all --overwrite-strategy force
```

## File Operations

**Location:** `src/cli/lib/files.ts`

### Key Functions

- **`detectConflict(filePath)`** - Checks if file exists at target path
- **`writeRuleFile(content, targetPath)`** - Creates directories and writes file
- **`applyNamingConvention(agent, filename)`** - Generates `.{agent}/rules/{filename}` paths

### Tool Conventions

Each AI agent has specific directory and file naming conventions:

```typescript
const toolConventions: Record<AIAgent, ToolConventions> = {
  cursor: {
    baseDir: ".cursor",
    extension: ".mdc",
    renameFile: (source) => source  // No renaming for cursor
  },
  windsurf: {
    baseDir: ".windsurf",
    extension: ".windsurfrules",
    renameFile: (source) => source  // Convention-based renaming
  }
  // ... other agents
}
```

## Configuration Management

**Location:** `src/cli/lib/config.ts`

### Config File Structure

**File:** `.ai-rules.json` (project root)

```json
{
  "version": "1.0",
  "agent": "cursor",
  "categories": ["typescript-strict", "react-patterns"]
}
```

### Operations

- **`loadConfig(projectRoot)`** - Load from `.ai-rules.json` or create default
- **`saveConfig(projectRoot, config)`** - Pretty-printed JSON with 2-space indent
- **`addCategory(config, category)`** - Immutably adds category to array

## Interactive Prompts

**Location:** `src/cli/lib/prompts.ts`

Uses Inquirer.js for interactive prompts:

- **`promptAgentSelection(agents)`** - List selection of AI agents
- **`promptCategorySelection(manifests)`** - Checkbox with "Select All" option
  - Shows: ID, tags (first 3), description preview
  - Preview shows full manifest details on request
- **`promptPreview(manifest)`** - Full manifest details display
- **`promptConflictResolution(filePath)`** - Yes/No confirmation for overwrite

## Data Fetching

**Location:** `src/cli/lib/github.ts`

See [API Architecture](./api-architecture.md) for details on API endpoints.

### In-Memory Caching

```typescript
const cachedRules: RulesResponse | null = null;
const cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
```

### Functions

- **`fetchRulesData()`** - Main entry point with cache check
- **`fetchAvailableAgents()`** - Returns list of agent names
- **`fetchManifests(agent)`** - Get all manifests for specific agent
- **`fetchRuleFile(agent, category, filename)`** - Get individual file content

## Error Handling

The CLI handles errors at command boundaries:

- **Network errors:** Display error message and suggest retry
- **File system errors:** Check permissions, suggest fixes
- **Invalid config:** Backup and recreate with defaults
- **API errors:** Display error details from server response
