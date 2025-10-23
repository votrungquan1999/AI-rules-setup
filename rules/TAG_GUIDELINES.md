# Tag Guidelines for AI Rules

This document outlines the guidelines for tagging rule categories in the AI Rules repository to ensure consistency and improve discoverability.

## Tag Naming Conventions

- Use **lowercase** with **hyphens** for multi-word tags
- Be **specific** and **searchable** - use terms developers would actually search for
- Avoid overly generic terms unless they provide meaningful categorization
- Keep tags concise but descriptive

## Tag Categories

### 1. Generic Tags (Broad Categorization)

Use these for high-level categorization, including but not limited to:

- `patterns` - Design patterns and architectural patterns
- `best-practices` - Industry best practices and conventions
- `conventions` - Coding conventions and style guidelines
- `styling` - CSS, design, and visual styling
- `architecture` - System and component architecture
- `database` - Database-related rules and patterns
- `state-management` - State management patterns and practices
- `meta` - Meta rules about rule application itself

### 2. Technology Stack Tags

Use specific technology names, including but not limited to:

- `react` - React framework
- `nextjs` - Next.js framework
- `typescript` - TypeScript language
- `tailwind` - Tailwind CSS
- `mongodb` - MongoDB database
- `shadcn` - shadcn/ui component library

### 3. Version Tags

Add version tags only when rules are version-specific, including but not limited to:

- `nextjs-13` - Next.js 13 specific features
- `nextjs-14` - Next.js 14 specific features
- `nextjs-15` - Next.js 15 specific features
- `react-18` - React 18 specific features
- `react-19` - React 19 specific features

**Note**: Only add version tags if the rules specifically apply to that version or if compatibility is important.

### 4. Feature-Specific Tags

Use for specific features or concepts, including but not limited to:

- `server-components` - React Server Components
- `app-router` - Next.js App Router
- `search-params` - URL search parameters
- `document-typing` - Database document typing
- `client-server-separation` - Server/client component separation

### 5. Pattern-Specific Tags

Use for specific patterns or practices, including but not limited to:

- `composition-pattern` - Component composition patterns
- `hooks-pattern` - React hooks patterns
- `context-pattern` - React Context patterns
- `file-structure` - File organization patterns
- `data-conversion` - Data transformation patterns

### 6. Quality and Process Tags

Use for code quality and development process, including but not limited to:

- `type-safety` - Type safety practices
- `performance-optimization` - Performance best practices
- `code-quality` - Code quality guidelines
- `error-handling` - Error handling patterns
- `scope-management` - Scope and complexity management

## Examples

### Good Tag Examples

```json
{
  "tags": [
    "react", // Technology
    "patterns", // Generic category
    "server-components", // Feature
    "nextjs", // Technology
    "nextjs-13", // Version (if applicable)
    "composition-pattern", // Pattern
    "client-server-separation" // Feature
  ]
}
```

### Bad Tag Examples

```json
{
  "tags": [
    "framework", // Too generic
    "use-client", // Too specific (implementation detail)
    "react-hooks-context", // Should be separate tags
    "best", // Incomplete
    "UI" // Wrong case
  ]
}
```

## Tag Selection Guidelines

1. **Start with technology stack** - What technologies does this rule apply to?
2. **Add generic category** - What type of rule is this? (patterns, best-practices, etc.)
3. **Add specific features** - What specific features or concepts are covered?
4. **Add version tags** - Only if version-specific or compatibility matters
5. **Add pattern tags** - What specific patterns or practices are described?
6. **Review for searchability** - Would a developer find this by searching these terms?
7. **Be creative** - Don't limit yourself to the examples above; create tags that make sense for your specific use case

## Tag Limits

- Aim for **5-10 tags** per manifest (guideline, not strict rule)
- Include **2-3 generic tags** for broad categorization (suggested)
- Include **2-4 technology tags** for tech stack filtering (suggested)
- Include **1-3 specific feature/pattern tags** for precise filtering (suggested)
- Avoid tag bloat - every tag should add value
- **Flexibility**: Adjust based on your specific needs and the complexity of your rules

## Maintenance

- Review tags quarterly for relevance
- Update version tags when new versions are released
- Remove outdated or unused tags
- Ensure consistency across similar rule categories
