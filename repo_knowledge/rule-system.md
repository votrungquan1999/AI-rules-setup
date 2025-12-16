# Rule System

This document describes how rules are organized, structured, and managed.

**Related Documentation:**
- [CLI Flows](./cli-flows.md) - How rules are installed
- [Data Types](./data-types.md) - Rule type definitions

## Repository Structure

```
/rules
  /cursor                    # AI agent directory
    /typescript             # Category directory
      manifest.json         # Category metadata
      strict-mode.md        # Rule file
      conventions.md        # Another rule file
      README.md            # Category documentation
    /react
      manifest.json
      server-components.md
      hooks-patterns.md
  /windsurf
    /typescript
      manifest.json
      rules.md
```

## Manifest Format

**File:** `manifest.json` (in each category directory)

```json
{
  "id": "typescript-strict",
  "category": "typescript",
  "tags": ["typescript", "strict-mode", "type-safety"],
  "description": "Strict TypeScript configuration and patterns",
  "files": [
    {
      "path": "strict-mode.md",
      "description": "Strict mode configuration and best practices"
    },
    {
      "path": "conventions.md",
      "description": "TypeScript naming and structure conventions"
    }
  ],
  "dependencies": ["javascript-basics"],
  "conflicts": ["typescript-flexible"]
}
```

### Manifest Fields

- **`id`** - Unique identifier (kebab-case), used for CLI commands
- **`category`** - Category name (matches directory name)
- **`tags`** - Search keywords for discovery
- **`description`** - Human-readable summary shown in selection UI
- **`files`** - Array of files to install
  - `path`: Relative path within category directory
  - `description`: Purpose of the file
- **`dependencies`** (optional) - Rule IDs that should be installed first
- **`conflicts`** (optional) - Rule IDs that conflict with this rule

## Rule File Format

Rule files are Markdown documents with frontmatter:

```markdown
---
alwaysApply: true
description: 'Brief description of rule'
---

# Rule Title

Rule content in Markdown format...

## Examples

✅ Correct:
\`\`\`typescript
// Good example
\`\`\`

❌ Incorrect:
\`\`\`typescript
// Bad example
\`\`\`
```

### Frontmatter Fields

- **`alwaysApply`** - Boolean indicating if rule should always be applied
- **`description`** - Brief description of the rule's purpose

## File Naming Conventions

### Source Files (in repository)

- Use descriptive kebab-case names: `server-components.md`
- Match the technical concept: `strict-mode.md`, `hooks-patterns.md`
- Keep names concise but clear

### Installed Files (in project)

Files are installed following AI agent conventions:

**Cursor:**
- Directory: `.cursor/rules/`
- Extension: `.mdc`
- Path: `.cursor/rules/server-components.mdc`

**Windsurf:**
- Directory: `.windsurf/rules/`
- Extension: `.windsurfrules`
- Path: `.windsurf/rules/server-components.windsurfrules`

**Convention transformation handled by CLI's `applyNamingConvention()` function.**

## Rule Categories

Rules are organized by technology/framework:

### Language Categories
- `typescript` - TypeScript patterns and conventions
- `javascript` - JavaScript patterns

### Framework Categories
- `react` - React patterns and best practices
- `nextjs` - Next.js specific patterns
- `vue` - Vue.js patterns

### Styling Categories
- `tailwind` - Tailwind CSS patterns
- `css-modules` - CSS Modules patterns

### Database Categories
- `database-patterns` - General database patterns
- `prisma` - Prisma ORM patterns
- `mongodb` - MongoDB patterns

### Application Categories
- `file-structure` - Project organization
- `composition` - Component composition patterns
- `state-management` - State management patterns
- `brainstorming` - Brainstorming and planning patterns

## Dependencies and Conflicts

### Dependencies

Rules can declare dependencies that should be installed first:

```json
{
  "id": "react-server-components",
  "dependencies": ["react-basics", "typescript-strict"]
}
```

**CLI behavior:**
- Checks if dependencies are already installed
- Warns user if dependencies are missing
- Suggests installing dependencies first

### Conflicts

Rules can declare conflicts with other rules:

```json
{
  "id": "typescript-strict",
  "conflicts": ["typescript-flexible", "javascript-loose"]
}
```

**CLI behavior:**
- Detects if conflicting rules are already installed
- Warns user about conflicts
- Prompts whether to proceed or skip

## Rule Validation

Rules should follow these guidelines (from `.cursor/rules/application_specific.mdc`):

1. **File Length:** Cursor rule files must be < 200 lines (preferably ~150 lines)
2. **Consistency:** When updating rules for one agent, update corresponding rules for other agents
3. **Manifest Sync:** When changing rule content, update manifest.json
4. **Master Reference:** Use `/rules.md` as master rule file and follow it

## Rule Discovery

Rules can be discovered through:

1. **Direct selection** - Browse all available categories
2. **Search** - Natural language search using tags and descriptions
3. **Questions** - Answer guided questions to refine selection

See [Search & Selection](./search-selection.md) for details on the search algorithm.
