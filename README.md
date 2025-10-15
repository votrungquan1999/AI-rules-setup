# AI Rules CLI

A command-line tool that helps developers pull curated AI agent rules from a centralized repository into their projects. No more hunting through scattered rule files - get the exact rules you need for your tech stack with a simple command.

## Quick Start

```bash
# Install globally
npm install -g ai-rules

# Initialize rules for your project
ai-rules init

# Add specific rule categories
ai-rules add typescript react

# Update to latest rules
ai-rules update
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
ai-rules search "nextjs 15 server components tailwind"
```

### 🔍 Interactive Refinement

Get personalized recommendations through guided questions:

- "Are you using App Router or Pages Router?"
- "What's your primary data fetching strategy?"
- "Do you prefer Tailwind or styled-components?"

### 📦 Easy Management

```bash
# See what's installed
ai-rules status

# Add more rules
ai-rules add nextjs database

# Remove unused rules
ai-rules remove old-framework

# Update everything
ai-rules update
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
      "source": "github.com/your-org/ai-rules"
    }
  ],
  "preferences": {
    "autoUpdate": false,
    "conflictResolution": "prompt"
  }
}
```

## Commands

### `ai-rules init`

Interactive setup wizard that guides you through:

- AI agent selection
- Tech stack identification
- Rule discovery and selection
- Installation configuration

### `ai-rules add <categories...>`

Add specific rule categories to your project:

```bash
ai-rules add typescript react nextjs
```

### `ai-rules remove <categories...>`

Remove rule categories from your project:

```bash
ai-rules remove old-framework
```

### `ai-rules update`

Update all installed rules to their latest versions:

```bash
ai-rules update
```

### `ai-rules list [--filter <tag>]`

List available rule categories with optional filtering:

```bash
ai-rules list --filter frontend
```

### `ai-rules status`

Show currently installed rules and their status:

```bash
ai-rules status
```

### `ai-rules search "<query>"`

Search for rules using natural language:

```bash
ai-rules search "nextjs 15 server components with tailwind"
```

### `ai-rules refine`

Re-run the refinement process for better rule selection:

```bash
ai-rules refine
```

## Contributing

We welcome contributions! See our [Contributing Guide](docs/contributing.md) for:

- How to add new rule categories
- Writing effective rule descriptions
- Submitting pull requests
- Community guidelines

## Roadmap

Check out our [detailed roadmap](docs/roadmap.md) to see what's coming:

- **Iteration 1**: MVP with Cursor support
- **Iteration 2**: Expanded rule library
- **Iteration 3**: Enhanced commands
- **Iteration 4**: Semantic search with vector DB
- **Iteration 5**: Interactive rule refinement
- **Iteration 6**: Web UI & community growth
- **Iteration 7**: Multi-tool support
- **Iteration 8**: Advanced features

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](docs/)
- 🐛 [Report Issues](https://github.com/your-org/ai-rules/issues)
- 💬 [Discussions](https://github.com/your-org/ai-rules/discussions)
- 📧 [Email Support](mailto:support@ai-rules.dev)

---

**Made with ❤️ for the developer community**
