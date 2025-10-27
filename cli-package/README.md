# AI Rules CLI

A command-line tool that helps developers pull curated AI agent rules from a centralized repository into their projects. No more hunting through scattered rule files - get the exact rules you need for your tech stack with a simple command.

## Quick Start

```bash
# Interactive mode - walk through prompts
npx @quanvo99/ai-rules init

# Non-interactive mode - specify options directly
npx @quanvo99/ai-rules init --agent cursor --categories typescript,react-hooks --overwrite-strategy force
```

## 🌐 Interactive Rule Selection

**Prefer a visual interface?** Use our web UI to browse, search, and select rules interactively:

👉 **[Open Rule Selector at https://ai-rules-setup.vercel.app/](https://ai-rules-setup.vercel.app/)**

The web interface allows you to:

- Browse all available rules with descriptions and tags
- Search rules using keywords
- Select multiple rules interactively
- Generate a non-interactive CLI command with your selections
- Copy and paste the command to install rules instantly

Example generated command:

```bash
npx @quanvo99/ai-rules init --agent cursor --categories typescript-conventions,react-hooks --overwrite-strategy force
```

## What is AI Rules CLI?

AI Rules CLI solves the problem of scattered, hard-to-find AI agent rule files across different projects. Instead of manually copying rules from various sources, you can:

- **Discover** rules by browsing categories and tags
- **Install** only the rules you need for your specific project
- **Choose** between interactive CLI prompts or web-based selection

## Supported AI Agents

- **Cursor** - `.cursor/rules/` directory with `.cursorrules` files
- **More coming soon** - Windsurf, Aider, Continue, Cody, and others

## Key Features

### 🎯 Interactive or Command-Line Driven

Choose your preferred workflow:

- **Interactive CLI** - Guided prompts for agent and category selection
- **Non-Interactive CLI** - Direct command with all options specified
- **Web UI** - Visual interface at https://ai-rules-setup.vercel.app/

### 📦 Multiple AI Agent Support

Works with:

- **Cursor** - `.cursor/rules/` directory
- More agents coming soon

### ⚙️ Flexible Conflict Resolution

Handle existing files your way:

- `prompt` - Ask for each conflict (default)
- `force` - Overwrite all existing files
- `skip` - Keep existing files, skip new ones

## How It Works

1. **Choose Your Interface** - Use the CLI in interactive mode or the web UI at https://ai-rules-setup.vercel.app/
2. **Select Agent** - Choose your AI agent (Cursor, Windsurf, etc.)
3. **Pick Categories** - Select rule categories that match your tech stack
4. **Handle Conflicts** - Decide how to handle existing files (prompt, force, or skip)
5. **Install** - Rules are automatically placed in the correct locations

## Project Structure

```
your-project/
├── .cursor/
│   └── rules/
│       ├── typescript-strict.md
│       ├── react-server-components.md
│       └── tailwind-best-practices.md
├── .ai-rules.json          # Configuration file
└── package.json
```

## Example Rule Categories

### Languages

- **TypeScript** - Strict typing, best practices, advanced patterns
- **JavaScript** - Modern ES6+, async patterns, error handling

### Frameworks

- **React** - Hooks, server components, performance optimization
- **Next.js** - App Router, Pages Router, SSR/SSG patterns
- **Vue** - Composition API, Nuxt.js patterns

### Styling

- **Tailwind CSS** - Utility-first, component patterns, responsive design
- **CSS Modules** - Scoped styling, naming conventions
- **Styled Components** - CSS-in-JS patterns, theming

### Database

- **Prisma** - Schema design, query optimization, migrations
- **MongoDB** - Document modeling, aggregation pipelines
- **PostgreSQL** - Query patterns, indexing strategies

### Testing

- **Jest** - Unit testing, mocking, test organization
- **Playwright** - E2E testing, page object patterns
- **Testing Library** - Component testing, accessibility

## Configuration

The CLI creates a `.ai-rules.json` file in your project root:

```json
{
  "version": "1.0.0",
  "agent": "cursor",
  "categories": ["typescript-conventions", "react-hooks", "meta-rules"]
}
```

## Commands

### `npx @quanvo99/ai-rules init`

Initialize AI rules for your project. Can be used in interactive or non-interactive mode.

**Interactive Mode:**

```bash
npx @quanvo99/ai-rules init
```

Walks you through:

- AI agent selection (cursor, windsurf, etc.)
- Category selection with descriptions and tags
- File conflict resolution

**Non-Interactive Mode:**

```bash
npx @quanvo99/ai-rules init [options]
```

**Options:**

- `--agent <name>` - Specify the AI agent (cursor, windsurf, etc.)
- `--categories <list>` - Comma-separated category IDs (use "all" for all categories)
- `--overwrite-strategy <strategy>` - Conflict resolution: `prompt` (default), `force`, or `skip`

**Examples:**

```bash
# Install specific categories for Cursor
npx @quanvo99/ai-rules init --agent cursor --categories typescript-conventions,react-hooks

# Install all categories with force overwrite
npx @quanvo99/ai-rules init --agent cursor --categories all --overwrite-strategy force

# Skip existing files
npx @quanvo99/ai-rules init --agent cursor --categories meta-rules --overwrite-strategy skip
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](https://github.com/votrungquan1999/AI-rules-setup#readme)
- 🐛 [Report Issues](https://github.com/votrungquan1999/AI-rules-setup/issues)
- 💬 [Discussions](https://github.com/votrungquan1999/AI-rules-setup/discussions)

---

**Made with ❤️ for the developer community**
