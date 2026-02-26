# CLI Command Flows

This document describes the CLI command flows and operations.

**Related Documentation:**
- [API Architecture](./api-architecture.md) - How CLI fetches data from API
- [Rule System](./rule-system.md) - Rule structure and file organization
- [Data Types](./data-types.md) - CLI type definitions
- [Skills & Workflows](./skills-workflows.md) - Skills and workflows system

## Main Entry Point

**File:** `src/cli/index.ts`

The CLI is built with Commander.js and provides two main commands: `init` and `pull`.

## `ai-rules init` Command

**Location:** `src/cli/commands/init.ts`

### Command Flow

```
1. Agent Selection
   ├─ Check --agent flag
   ├─ Fetch available agents from API
   └─ Prompt user if not provided (cursor, windsurf, aider, continue, cody, claude-code, antigravity)

2. Category Selection
   ├─ Skip if --no-categories flag is set
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

5. File Installation (Rules)
   ├─ For each manifest file:
   │  ├─ Fetch content from API
   │  ├─ Apply naming convention (.{agent}/rules/{filename})
   │  ├─ Create directories
   │  └─ Write file
   └─ Log each installation

6. Skill Installation
   ├─ Skip if --no-skills flag is set
   ├─ Use --skills flag for non-interactive mode
   ├─ Interactive prompt if TTY available (process.stdin.isTTY)
   ├─ Fetch available skills via fetchSkills()
   ├─ Apply skill naming convention (applySkillNamingConvention)
   └─ Conflict detection follows same strategy as rules

7. Workflow Installation
   ├─ Skip if --no-workflows flag is set
   ├─ Use --workflows flag for non-interactive mode
   ├─ Interactive prompt if TTY available (process.stdin.isTTY)
   ├─ Fetch available workflows via fetchWorkflows()
   └─ Install to .agent/workflows/<name>.md

8. Config Update
   ├─ Add installed categories, skills, and workflows to config
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

# Install specific skills and workflows non-interactively
ai-rules init --agent antigravity --skills tdd-design,bdd-design --workflows feature-development

# Skip categories, install only skills
ai-rules init --agent claude-code --no-categories --skills tdd-design

# Skip everything except categories
ai-rules init --agent cursor --no-skills --no-workflows
```

## `ai-rules pull` Command

**Location:** `src/cli/commands/pull.ts`

Re-installs all content tracked in `.ai-rules.json` config with latest versions from the API.

### Command Flow

```
1. Load config from .ai-rules.json
   ├─ Read agent, categories, skills, workflows

2. Pull Rules (by category)
   ├─ For each category in config:
   │  ├─ Find matching manifest
   │  ├─ Fetch each file's content
   │  ├─ Apply naming convention
   │  └─ Write to disk (force overwrite)

3. Pull Skills
   ├─ For each skill in config:
   │  ├─ Find matching skill from API
   │  ├─ Apply skill naming convention
   │  └─ Write to disk

4. Pull Workflows
   ├─ For each workflow in config:
   │  ├─ Find matching workflow from API
   │  └─ Write to .agent/workflows/<name>.md

5. Report results
   └─ Display total items pulled
```

### Example Commands

```bash
# Pull latest versions (force overwrite by default)
ai-rules pull

# Pull with skip strategy (keep existing files)
ai-rules pull --overwrite-strategy skip
```

**Key difference from `init`:** The `pull` command does NOT prompt for selection — it uses the existing config to re-install everything.

## File Operations

**Location:** `src/cli/lib/files.ts`

### Key Functions

- **`detectConflict(filePath)`** - Checks if file exists at target path
- **`writeRuleFile(content, targetPath)`** - Creates directories and writes file
- **`applyNamingConvention(agent, filename)`** - Generates `.{agent}/rules/{filename}` paths
- **`applySkillNamingConvention(agent, skillName)`** - Generates skill installation paths (e.g., `.agent/skills/{name}/SKILL.md` for Antigravity)

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
  "agent": "antigravity",
  "categories": ["typescript-strict", "react-patterns"],
  "skills": ["tdd-design", "bdd-design"],
  "workflows": ["feature-development", "commit-plan"]
}
```

### Operations

- **`loadConfig(projectRoot)`** - Load from `.ai-rules.json` or create default
- **`saveConfig(projectRoot, config)`** - Pretty-printed JSON with 2-space indent
- **`addCategory(config, category)`** - Immutably adds category to array
- **`addSkill(config, skill)`** - Immutably adds skill (deduplicates)
- **`addWorkflow(config, workflow)`** - Immutably adds workflow (deduplicates)

## Interactive Prompts

**Location:** `src/cli/lib/prompts.ts`

Uses Inquirer.js for interactive prompts:

- **`promptAgentSelection(agents)`** - List selection of AI agents
- **`promptCategorySelection(manifests)`** - Checkbox with "Select All" option
  - Shows: ID, tags (first 3), description preview
  - Preview shows full manifest details on request
- **`promptSkillSelection(skills)`** - Checkbox with "🎯 Select All" option
  - Shows skill names in cyan bold
- **`promptWorkflowSelection(workflows)`** - Checkbox with "⚡ Select All" option
  - Shows workflow names in cyan bold
- **`promptPreview(manifest)`** - Full manifest details display
- **`promptConflictResolution(filePath)`** - Yes/No confirmation for overwrite

**TTY guard:** Skill and workflow interactive prompts only appear when `process.stdin.isTTY` is truthy, preventing hangs in non-interactive CI/CD or piped environments.

## Data Fetching

**Location:** `src/cli/lib/api-client.ts` (refactored from `github.ts`)

See [API Architecture](./api-architecture.md) for details on API endpoints.

### In-Memory Caching

```typescript
const cachedRules: RulesResponse | null = null;
const cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
```

### Functions

- **`fetchRulesData()`** - Main entry point with cache check (private)
- **`fetchAvailableAgents()`** - Returns list of agent names
- **`fetchManifests(agent)`** - Get all manifests for specific agent
- **`fetchRuleFile(agent, category, filename)`** - Get individual file content
- **`fetchSkills(agent)`** - Get all skills for agent (returns `{ name, content }[]`)
- **`fetchWorkflows(agent)`** - Get all workflows for agent (returns `{ name, content }[]`)
- **`setCachedRules(data)`** - Inject test data directly (testing utility)
- **`resetCache()`** - Clear cached data (testing utility)

## Error Handling

The CLI handles errors at command boundaries:

- **Network errors:** Display error message and suggest retry
- **File system errors:** Check permissions, suggest fixes
- **Invalid config:** Backup and recreate with defaults
- **API errors:** Display error details from server response
- **Missing content:** Individual skill/workflow/rule failures are logged but do not abort the entire operation
