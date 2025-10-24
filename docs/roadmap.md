# AI Rules CLI - Iterative Development Roadmap

## Overview

This roadmap outlines the iterative development strategy for the AI Rules CLI project. Each iteration builds upon the previous one, adding measurable value while maintaining a working product at all times.

## Development Principles

- **MVP First**: Start with the bare minimum viable product
- **Iterative Enhancement**: Each iteration adds clear value
- **User Feedback Driven**: Incorporate feedback between iterations
- **Maintainable**: Keep code clean and well-documented
- **Extensible**: Design for future growth

## Iteration Timeline

| Iteration | Duration  | Focus                          | Status  |
| --------- | --------- | ------------------------------ | ------- |
| 1         | 2-3 weeks | MVP with Cursor support        | Planned |
| 2         | 2-3 weeks | Expand Cursor rule library     | Planned |
| 3         | 2-3 weeks | Enhanced commands              | Planned |
| 4         | 3-4 weeks | Semantic search with vector DB | Planned |
| 5         | 3-4 weeks | Interactive rule refinement    | Planned |
| 6         | 4-5 weeks | Web UI & community growth      | Planned |
| 7         | 3-4 weeks | Multi-tool support             | Planned |
| 8         | 4-5 weeks | Advanced features              | Planned |

---

## Iteration 1: MVP (Bare Minimum)

**Duration**: 2-3 weeks  
**Goal**: Prove core concept with single tool support

### Features

#### Core CLI Functionality

- [ ] CLI scaffolding with Commander.js
- [ ] Basic command structure (`init`, `add`, `remove`, `update`, `list`, `status`)
- [ ] Interactive prompts using Inquirer.js
- [ ] GitHub API integration for fetching rules
- [ ] File writing to configured paths
- [ ] Conflict detection (filename match) with user prompt
- [ ] Config persistence via `.ai-rules.json`

#### Cursor Support

- [ ] Support Cursor only with 2-3 categories:
  - TypeScript strict mode rules
  - React Server Components patterns
  - Tailwind CSS best practices
- [ ] Convention-based file renaming (`.cursor/rules/*.md`)
- [ ] Directory creation as needed

#### Basic Error Handling

- [ ] Network failures with retry logic
- [ ] File I/O errors with helpful messages
- [ ] Invalid user input handling
- [ ] GitHub API rate limiting

### Technical Implementation

#### Project Structure

```
/cli
/rules
  /cursor
    /typescript
      manifest.json
      typescript-strict.md
      README.md
    /react
      manifest.json
      react-server-components.md
      README.md
    /tailwind
      manifest.json
      tailwind-best-practices.md
      README.md
```

### Success Criteria

- [ ] CLI works end-to-end for Cursor
- [ ] Can install 3 rule categories successfully
- [ ] Handles conflicts gracefully
- [ ] Saves and loads configuration
- [ ] Clear error messages for common issues

### Deliverables

- Working CLI tool published to NPM
- 3 sample rule files in GitHub
- Basic documentation
- Installation and usage guide

---

## Iteration 2: Expand Cursor Rule Library

**Duration**: 2-3 weeks  
**Goal**: Build comprehensive rule coverage for Cursor

### Features

#### Expanded Rule Categories

- [ ] Add 10-15 more Cursor categories:
  - Next.js (App Router, Pages Router, SSR/SSG)
  - React patterns (Hooks, Context, Performance)
  - Database (Prisma, MongoDB, PostgreSQL)
  - Testing (Jest, Playwright, Testing Library)
  - Styling (CSS Modules, Styled Components)
  - Build tools (Webpack, Vite, Turbopack)
  - Deployment (Vercel, Netlify, Docker)
  - Security (Authentication, Authorization, CORS)

#### Improved Metadata

- [ ] Better manifest descriptions (10-500 characters)
- [ ] Comprehensive tags for filtering
- [ ] Rule examples and usage documentation
- [ ] Category relationships (dependencies, conflicts)

#### Rule Composition

- [ ] Guidelines for how rules work together
- [ ] Best practices for rule organization
- [ ] Template for creating new rule categories

### Technical Implementation

#### Enhanced Manifest Schema

```json
{
  "id": "nextjs-app-router",
  "category": "nextjs",
  "tags": ["framework", "nextjs", "app-router", "ssr"],
  "description": "Next.js App Router patterns, Server Components, and routing best practices",
  "dependencies": ["typescript-strict", "react-server-components"],
  "conflicts": ["nextjs-pages-router"],
  "files": [
    {
      "path": "app-router.md",
      "description": "Core App Router patterns and conventions"
    },
    {
      "path": "routing.md",
      "description": "File-based routing best practices"
    }
  ]
}
```

#### Category Templates

- [ ] Template for creating new rule categories
- [ ] Checklist for rule quality
- [ ] Examples of good rule descriptions

### Success Criteria

- [ ] 15-20 Cursor rule categories ready for production
- [ ] All categories have comprehensive metadata
- [ ] Rules are well-organized and discoverable
- [ ] Clear guidelines for contributors

### Deliverables

- Expanded rules repository
- Contributing guide for rule creation
- Category creation templates
- Rule quality checklist

---

## Iteration 3: Web UI & Enhanced Commands

**Duration**: 2-3 weeks  
**Goal**: Improve developer experience with web UI and enhanced CLI

### Features

#### Web UI for Rule Selection (Priority)

- [x] Non-interactive CLI with flags (`--agent`, `--categories`, `--overwrite-strategy`)
- [x] Fuzzy search with relevancy scoring using Fuse.js
- [x] Web UI at `/select-rules` with search and selection interface
- [x] Command generation with copy-to-clipboard functionality
- [x] Overwrite strategy selection in both UI and CLI
- [x] Context-based component architecture for server/client composition
- [x] Score-based CSS ordering for search results
- [x] Tailwind CSS integration with shadcn/ui components

**Benefits**: Users can now use a visual interface to search and select rules, then generate a non-interactive CLI command. This dramatically improves UX compared to the CLI-only approach.

#### New Commands

- [ ] `ai-rules add <category>` - Add specific categories
- [ ] `ai-rules remove <category>` - Remove categories
- [ ] `ai-rules list [--filter <tag>]` - List available categories with filtering

#### Conflict file name handling

- [x] Non-interactive conflict resolution with `--overwrite-strategy` flag
- [ ] Pause the process and ask user if want to override or not (interactive mode)

#### Validation and Safety

- [ ] File size validation
- [ ] Encoding validation
- [ ] Path sanitization
- [ ] Permission checking

#### Improved User Experience

- [ ] Progress indicators for long operations
- [ ] Colored output for better readability
- [ ] Verbose mode for debugging
- [ ] Dry-run mode for testing

### Technical Implementation

#### Command Structure

```typescript
// add.ts
export async function addCommand(categories: string[]) {
  // Implementation
}

// remove.ts
export async function removeCommand(categories: string[]) {
  // Implementation
}

// list.ts
export async function listCommand(filter?: string) {
  // Implementation
}
```

### Success Criteria

- [ ] All commands work reliably
- [ ] Conflict resolution is user-friendly
- [ ] Validation prevents common errors
- [ ] User experience is smooth and intuitive

### Deliverables

- Complete command suite
- Enhanced file management
- Improved error handling
- User experience improvements

---

## Iteration 4: Semantic Search with Vector DB

**Duration**: 3-4 weeks  
**Goal**: Enable natural language rule discovery

### Features

#### Vector Database Integration

- [ ] Integrate vector database (LanceDB for local, Pinecone for cloud)
- [ ] Embed rule descriptions and content into vector space
- [ ] Build free-text search functionality
- [ ] Return ranked rule IDs based on semantic similarity

#### Search Command

- [ ] `ai-rules search "<query>"` command
- [ ] Natural language queries (e.g., "nextjs 15 server components tailwind")
- [ ] Search results with relevance scores
- [ ] Integration with existing `init` flow

#### Embedding Strategy

- [ ] Use OpenAI text-embedding-3-small or local sentence-transformers
- [ ] Pre-embed rule content on updates
- [ ] Store embeddings in manifest or separate index
- [ ] Configurable similarity score cutoff

#### Fallback Mechanisms

- [ ] Fallback to tag-based filtering if vector DB unavailable
- [ ] Hybrid search (semantic + keyword)
- [ ] Offline mode with cached embeddings

### Success Criteria

- [ ] Natural language search works reliably
- [ ] Search results are relevant and ranked properly
- [ ] Fallback mechanisms work when vector DB is unavailable
- [ ] Search performance is acceptable (<2 seconds)

### Deliverables

- Vector database integration
- Search command implementation
- Embedding pipeline
- Search documentation and examples

---

## Iteration 5: Interactive Rule Refinement

**Duration**: 3-4 weeks  
**Goal**: Guide users to better rule selection through context-aware questioning

### Features

#### Question Bank System

- [ ] Build question bank for each tech stack
- [ ] Store questions in manifests or separate files
- [ ] Support multiple question types (choice, boolean, text)
- [ ] Conditional question logic

#### Refinement Flow

- [ ] After vector search, ask clarifying questions
- [ ] Example: "nextjs 15 server components" → matches 5 rules → asks "App Router or Pages Router?" → refines to 3 rules
- [ ] Store question trees per category
- [ ] Use answers to re-rank or filter rule results

#### Iterative Refinement

- [ ] Support iterative refinement cycle
- [ ] Show results → ask question → refine → repeat until satisfied
- [ ] Save user preferences to `.ai-rules.json`
- [ ] `ai-rules refine` command to re-run refinement

#### Question Schema

```json
{
  "category": "nextjs",
  "questions": [
    {
      "id": "router-type",
      "text": "Which Next.js router are you using?",
      "type": "choice",
      "choices": ["App Router", "Pages Router"],
      "affects": ["nextjs-app-router", "nextjs-server-components"]
    },
    {
      "id": "data-fetching",
      "text": "Primary data fetching strategy?",
      "type": "choice",
      "choices": ["Server Components", "React Query", "SWR"],
      "required": { "router-type": "App Router" },
      "affects": ["react-server-components", "react-query-rules"]
    }
  ]
}
```

### Success Criteria

- [ ] Question flow guides users to better rule selection
- [ ] Refinement process is intuitive and helpful
- [ ] User preferences are saved and reused
- [ ] Refinement significantly improves rule relevance

### Deliverables

- Question bank system
- Refinement engine
- Enhanced init flow
- Refinement documentation

---

## Iteration 6: Web UI & Community Growth

**Duration**: 4-5 weeks  
**Goal**: Enable broader ecosystem and community contributions

### Features

#### Web UI Platform

- [ ] Build web UI for browsing available rules
- [ ] Visual rule explorer with search and filtering
- [ ] Rule preview and documentation
- [ ] Category browsing and discovery

#### Community Features

- [ ] User-submitted rule reviews and ratings
- [ ] Rule usage examples and screenshots
- [ ] Community contribution workflow
- [ ] GitHub templates and PR guidelines

#### Analytics Dashboard

- [ ] Rule popularity and usage statistics
- [ ] Popular rule combinations
- [ ] User behavior analytics
- [ ] Performance metrics

#### Public API

- [ ] REST API for programmatic access
- [ ] Rule metadata endpoints
- [ ] Search API with vector support
- [ ] Rate limiting and authentication

### Success Criteria

- [ ] Web UI is functional and user-friendly
- [ ] Community features encourage contributions
- [ ] Analytics provide useful insights
- [ ] API supports third-party integrations

### Deliverables

- Web application (Next.js)
- Public API
- Community contribution tools
- Analytics dashboard

---

## Iteration 7: Multi-Tool Support

**Duration**: 3-4 weeks  
**Goal**: Validate tool-agnostic design

### Features

#### Additional AI Agents

- [ ] Add Windsurf support with separate folder structure
- [ ] Add Aider support
- [ ] Add Continue support
- [ ] Add Cody support

#### Tool-Specific Conventions

- [ ] Implement convention-based file renaming per tool
- [ ] Enhanced prompts for tool selection
- [ ] Tool-specific configuration options
- [ ] Port existing Cursor rules to other tools

#### Multi-Tool Workflow

- [ ] Support multiple tools in one project
- [ ] Tool-specific rule management
- [ ] Cross-tool rule sharing
- [ ] Tool compatibility checking

### Technical Implementation

#### Tool Registry

```typescript
class ToolRegistry {
  registerTool(tool: AITool): void
  getTool(name: string): AITool | null
  getAllTools(): AITool[]
  getToolConventions(tool: string): ToolConventions
}
```

#### Tool-Specific Handlers

```typescript
class CursorHandler implements ToolHandler {
  getOutputPath(category: string): string
  renameFile(source: string, category: string): string
  validateInstallation(): boolean
}

class WindsurfHandler implements ToolHandler {
  getOutputPath(category: string): string
  renameFile(source: string, category: string): string
  validateInstallation(): boolean
}
```

### Success Criteria

- [ ] 3+ AI tools supported
- [ ] Tool-specific conventions work correctly
- [ ] Multi-tool projects are supported
- [ ] Rules can be shared across tools

### Deliverables

- Multi-tool support
- Tool-specific handlers
- Enhanced CLI commands
- Multi-tool documentation

---

## Iteration 8: Advanced Features

**Duration**: 4-5 weeks  
**Goal**: Production-ready polish

### Features

#### Version Management

- [ ] Version pinning (`--ref` flag for specific commits/tags)
- [ ] Lockfile support (`.ai-rules.lock.json`)
- [ ] Semantic versioning for rule categories
- [ ] Dependency resolution

#### Template System

- [ ] Template variables in rules (e.g., `{{PROJECT_NAME}}`, `{{FRAMEWORK}}`)
- [ ] Dynamic rule generation
- [ ] Custom template support
- [ ] Variable substitution

#### Rule Composition

- [ ] Combine multiple rules into one file
- [ ] Rule merging and conflict resolution
- [ ] Custom rule combinations
- [ ] Rule inheritance

#### Advanced CLI Features

- [ ] Interactive update with changelog
- [ ] Batch operations
- [ ] Plugin system for custom rules sources
- [ ] Telemetry (opt-in anonymous usage stats)

#### CI/CD Integration

- [ ] GitHub Actions for automatic rule validation
- [ ] Rule testing and validation
- [ ] Automated rule updates
- [ ] Quality gates

### Success Criteria

- [ ] Version management works reliably
- [ ] Template system is flexible and powerful
- [ ] Rule composition handles conflicts well
- [ ] CI/CD integration is robust

### Deliverables

- Advanced CLI features
- Template system
- Rule composition engine
- CI/CD integration

---

## Success Metrics

### Iteration 1

- [ ] CLI works end-to-end for Cursor
- [ ] 3 rule categories available
- [ ] Basic error handling works

### Iteration 2

- [ ] 15-20 Cursor rule categories
- [ ] Comprehensive metadata
- [ ] Clear contributor guidelines

### Iteration 3

- [ ] All commands work reliably
- [ ] Conflict file name handling works
- [ ] User experience is smooth

### Iteration 4

- [ ] Natural language search works
- [ ] Search results are relevant
- [ ] Performance is acceptable

### Iteration 5

- [ ] Refinement improves rule selection
- [ ] Question flow is intuitive
- [ ] User preferences are saved

### Iteration 6

- [ ] Web UI is functional
- [ ] Community features work
- [ ] Analytics provide insights

### Iteration 7

- [ ] 3+ AI tools supported
- [ ] Multi-tool projects work
- [ ] Tool conventions are correct

### Iteration 8

- [ ] Version management works
- [ ] Template system is powerful
- [ ] CI/CD integration is robust

## Risk Mitigation

### Technical Risks

- **Vector DB Performance**: Start with local LanceDB, add cloud support later
- **GitHub API Limits**: Implement caching and rate limiting
- **File System Issues**: Comprehensive error handling and validation

### Product Risks

- **User Adoption**: Focus on developer experience and clear value proposition
- **Rule Quality**: Establish quality guidelines and review process
- **Community Growth**: Provide clear contribution guidelines and templates

### Timeline Risks

- **Scope Creep**: Stick to iteration goals, defer nice-to-have features
- **Technical Complexity**: Start simple, add complexity iteratively
- **Dependencies**: Minimize external dependencies, have fallbacks

## Post-Iteration 8

### Future Considerations

- **Machine Learning**: Learn from usage patterns to improve recommendations
- **Enterprise Features**: Team management, private rule repositories
- **Mobile Support**: CLI tools for mobile development
- **IDE Integration**: Direct integration with popular IDEs
- **Rule Marketplace**: Community-driven rule sharing and monetization

### Maintenance

- **Regular Updates**: Keep rules current with technology changes
- **Community Support**: Maintain active community engagement
- **Performance Optimization**: Continuous improvement of search and discovery
- **Security**: Regular security audits and updates
