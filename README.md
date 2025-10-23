# AI Rules CLI

A command-line tool that helps developers pull curated AI agent rules from a centralized repository into their projects. No more hunting through scattered rule files - get the exact rules you need for your tech stack with a simple command.

## Quick Start

### 1. Start the Database (Optional)

For local development, you can use Docker to run MongoDB:

```bash
# Start MongoDB with Docker Compose
docker-compose up -d mongodb

# Or start with web UI
docker-compose up -d
```

See [DOCKER_README.md](./DOCKER_README.md) for detailed setup instructions.

### 2. Start the API Server

```bash
# Clone the repository
git clone https://github.com/votrungquan1999/AI-rules-setup.git
cd AI-rules-setup

# Install dependencies
npm install

# Start the Next.js API server (in one terminal)
npm run dev:api
```

### 3. Use the CLI

```bash
# In another terminal, run the CLI
npm run dev:cli init

# Or build and install globally
npm run build
npm install -g .
ai-rules init
```

### 4. Development

```bash
# Run API server
npm run dev:api

# Run CLI in development mode
npm run dev:cli init
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

## Architecture

The system uses a two-tier architecture for optimal performance:

### Next.js API Server (`src/app/`)

- **Caches** GitHub repository content for 5 minutes
- **Reduces** GitHub API rate limiting
- **Provides** centralized rule management
- **Runs** on `http://localhost:3000` by default

### CLI Tool (`src/cli/`)

- **Fetches** rules from the API server instead of local files
- **Handles** user interaction and file operations
- **Manages** project configuration and rule installation

## How It Works

1. **Start API** - Next.js server fetches and caches rules from GitHub
2. **Initialize** - Choose your AI agent and tech stack
3. **Discover** - Search for relevant rules using natural language
4. **Refine** - Answer questions to get personalized recommendations
5. **Install** - Rules are automatically placed in the correct locations
6. **Update** - Keep your rules current with the latest versions

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

## Testing

The tests run against the real Next.js API server. Before running tests, start the API server:

```bash
# Terminal 1: Start the API server
npm run dev:api

# Terminal 2: Run tests
npm test
```

The tests will automatically detect if the API server is running and test against real data from the GitHub repository.

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

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](docs/)
- 🐛 [Report Issues](https://github.com/your-org/ai-rules/issues)
- 💬 [Discussions](https://github.com/your-org/ai-rules/discussions)
- 📧 [Email Support](mailto:support@ai-rules.dev)

---

**Made with ❤️ for the developer community**
