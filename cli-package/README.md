# AI Rules CLI

A command-line tool that helps developers pull curated AI agent rules from a centralized repository into their projects. No more hunting through scattered rule files - get the exact rules you need for your tech stack with a simple command.

## Quick Start

```bash
# Initialize rules for your project (no installation needed!)
npx @quanvo99/ai-rules init

# Add specific rule categories
npx @quanvo99/ai-rules add typescript react

# Update to latest rules
npx @quanvo99/ai-rules update
```

## What is AI Rules CLI?

AI Rules CLI solves the problem of scattered, hard-to-find AI agent rule files across different projects. Instead of manually copying rules from various sources, you can:

- **Discover** rules by tech stack using natural language search
- **Install** only the rules you need for your specific project
- **Update** to the latest rule versions with a single command
- **Refine** your selection through intelligent questioning

## Supported AI Agents

- **Cursor** - `.cursor/rules/` directory with `.cursorrules` files
- **Windsurf** - `.windsurf/rules/` directory with `.windsurfrules` files
- **More coming soon** - Aider, Continue, Cody, and others

## Key Features

### 🎯 Smart Rule Discovery

Use natural language to find relevant rules:

```bash
npx @quanvo99/ai-rules search "nextjs 15 server components tailwind"
```

### 🔍 Interactive Refinement

Get personalized recommendations through guided questions:

- "Are you using App Router or Pages Router?"
- "What's your primary data fetching strategy?"
- "Do you prefer Tailwind or styled-components?"

### 📦 Easy Management

```bash
# See what's installed
npx @quanvo99/ai-rules status

# Add more rules
npx @quanvo99/ai-rules add nextjs database

# Remove unused rules
npx @quanvo99/ai-rules remove old-framework

# Update everything
npx @quanvo99/ai-rules update
```

## How It Works

1. **Initialize** - Choose your AI agent and tech stack
2. **Discover** - Search for relevant rules using natural language
3. **Refine** - Answer questions to get personalized recommendations
4. **Install** - Rules are automatically placed in the correct locations
5. **Update** - Keep your rules current with the latest versions

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

## Available Rule Categories

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
  "agent": "cursor",
  "rules": [
    {
      "id": "typescript-strict",
      "category": "typescript",
      "installedAt": "2024-01-15T10:30:00Z",
      "source": "github.com/votrungquan1999/AI-rules-setup"
    }
  ],
  "preferences": {
    "autoUpdate": false,
    "conflictResolution": "prompt"
  }
}
```

## Commands

### `npx @quanvo99/ai-rules init`

Interactive setup wizard that guides you through:

- AI agent selection
- Tech stack identification
- Rule discovery and selection
- Installation configuration

### `npx @quanvo99/ai-rules add <categories...>`

Add specific rule categories to your project:

```bash
npx @quanvo99/ai-rules add typescript react nextjs
```

### `npx @quanvo99/ai-rules remove <categories...>`

Remove rule categories from your project:

```bash
npx @quanvo99/ai-rules remove old-framework
```

### `npx @quanvo99/ai-rules update`

Update all installed rules to their latest versions:

```bash
npx @quanvo99/ai-rules update
```

### `npx @quanvo99/ai-rules list [--filter <tag>]`

List available rule categories with optional filtering:

```bash
npx @quanvo99/ai-rules list --filter frontend
```

### `npx @quanvo99/ai-rules status`

Show currently installed rules and their status:

```bash
npx @quanvo99/ai-rules status
```

### `npx @quanvo99/ai-rules search "<query>"`

Search for rules using natural language:

```bash
npx @quanvo99/ai-rules search "nextjs 15 server components with tailwind"
```

### `npx @quanvo99/ai-rules refine`

Re-run the refinement process for better rule selection:

```bash
npx @quanvo99/ai-rules refine
```

## Environment Variables

You can configure the API endpoint if needed:

```bash
# Set custom API URL (optional)
export AI_RULES_API_URL=https://your-api-domain.com
npx @quanvo99/ai-rules init
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](https://github.com/votrungquan1999/AI-rules-setup#readme)
- 🐛 [Report Issues](https://github.com/votrungquan1999/AI-rules-setup/issues)
- 💬 [Discussions](https://github.com/votrungquan1999/AI-rules-setup/discussions)

---

**Made with ❤️ for the developer community**
