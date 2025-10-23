# AI Rules Repository

This directory contains curated AI agent rules organized by tool and category. Each rule category includes comprehensive guidelines, best practices, and patterns for specific technologies and frameworks.

## Repository Structure

```
/rules
├── /cursor                    # Cursor AI rules
│   ├── /typescript
│   │   ├── manifest.json
│   │   ├── typescript-strict.md
│   │   ├── typescript-advanced.md
│   │   └── README.md
│   ├── /react
│   │   ├── manifest.json
│   │   ├── react-server-components.md
│   │   ├── react-hooks.md
│   │   └── README.md
│   ├── /nextjs
│   │   ├── manifest.json
│   │   ├── app-router.md
│   │   ├── pages-router.md
│   │   └── README.md
│   └── /tailwind
│       ├── manifest.json
│       ├── tailwind-best-practices.md
│       └── README.md
├── /windsurf                  # Windsurf AI rules
│   ├── /typescript
│   │   ├── manifest.json
│   │   ├── typescript-strict.md
│   │   └── README.md
│   └── /react
│       ├── manifest.json
│       ├── react-patterns.md
│       └── README.md
├── /aider                     # Aider AI rules (future)
└── README.md                  # This file
```

## Rule Categories

### Languages

- **TypeScript**: Strict typing, advanced patterns, best practices
- **JavaScript**: Modern ES6+, async patterns, error handling
- **Python**: Type hints, async/await, best practices
- **Go**: Conventions, error handling, performance

### Frameworks

- **React**: Hooks, server components, performance optimization
- **Next.js**: App Router, Pages Router, SSR/SSG patterns
- **Vue**: Composition API, Nuxt.js patterns
- **Svelte**: Component patterns, stores, SSR

### Styling

- **Tailwind CSS**: Utility-first, component patterns, responsive design
- **CSS Modules**: Scoped styling, naming conventions
- **Styled Components**: CSS-in-JS patterns, theming

### Database

- **Prisma**: Schema design, query optimization, migrations
- **MongoDB**: Document modeling, aggregation pipelines
- **PostgreSQL**: Query patterns, indexing strategies
- **Redis**: Caching patterns, data structures

### Testing

- **Jest**: Unit testing, mocking, test organization
- **Playwright**: E2E testing, page object patterns
- **Testing Library**: Component testing, accessibility

### Build Tools

- **Webpack**: Configuration, optimization, plugins
- **Vite**: Fast builds, HMR, plugins
- **Turbopack**: Next.js build tool, performance

### Deployment

- **Vercel**: Next.js deployment, edge functions
- **Netlify**: Static sites, serverless functions
- **Docker**: Containerization, multi-stage builds

### Security

- **Authentication**: JWT, OAuth, session management
- **Authorization**: RBAC, permissions, middleware
- **CORS**: Cross-origin requests, security headers

## File Organization

### Directory Structure

Each AI agent has its own directory with subdirectories for each rule category:

```
/agent-name
  /category-name
    manifest.json          # Category metadata
    rule-file-1.md         # Main rule file
    rule-file-2.md         # Additional rule file
    README.md              # Category documentation
```

### Naming Conventions

- **Directories**: Use lowercase with hyphens (`typescript-strict`)
- **Files**: Use descriptive names with hyphens (`react-server-components.md`)
- **Manifests**: Always named `manifest.json`
- **Documentation**: Always named `README.md`

## Manifest Files

Each rule category must include a `manifest.json` file that describes:

- **Category metadata**: ID, description, tags, version
- **File information**: List of files and their purposes
- **Dependencies**: Other rule categories this depends on
- **Conflicts**: Rule categories that conflict with this one
- **Questions**: Refinement questions for better rule selection

### Example Manifest

```json
{
  "id": "typescript-strict",
  "category": "typescript",
  "tags": ["language", "typed", "strict"],
  "description": "TypeScript strict mode rules with comprehensive type checking and best practices",
  "version": "1.2.0",
  "lastUpdated": "2024-01-15T10:30:00Z",
  "files": [
    {
      "path": "typescript-strict.md",
      "description": "Main TypeScript strict mode rules",
      "required": true
    },
    {
      "path": "typescript-advanced.md",
      "description": "Advanced TypeScript patterns and utilities",
      "required": false
    }
  ],
  "questions": [
    {
      "id": "strict-mode",
      "text": "Do you want to enable strict mode?",
      "type": "boolean",
      "default": "true",
      "affects": ["typescript-strict"]
    }
  ],
  "dependencies": [],
  "conflicts": ["typescript-loose"]
}
```

## Rules

### Rule 1: Specific Rule Title

**What**: Clear description of what to do
**Why**: Explanation of why this rule matters
**How**: Specific implementation guidance

```typescript
// Good example
const Component = async () => {
  const data = await fetchData()
  return <div>{data.title}</div>
}

// Bad example
const Component = () => {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetchData().then(setData)
  }, [])
  return <div>{data?.title}</div>
}
```

### Rule 2: Another Rule Title

[Continue with more rules...]

## Common Patterns

### Pattern 1: Server Component with Data Fetching

Use Server Components for data fetching to reduce client-side JavaScript and improve performance.

```typescript
// Good: Server Component with direct data fetching
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUserById(userId)

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}

// Good: Client Component for interactivity
;('use client')
function UserActions({ userId }: { userId: string }) {
  const [isEditing, setIsEditing] = useState(false)

  return <button onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'Cancel' : 'Edit'}</button>
}
```

### Pattern 2: Another Pattern Title

[Continue with more patterns...]

## Anti-Patterns

### Anti-Pattern 1: Client-Side Data Fetching in Server Components

Don't use client-side data fetching patterns in Server Components.

```typescript
// Bad: Using useEffect in Server Component
async function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then(setUser)
  }, [userId])

  if (!user) return <div>Loading...</div>

  return <div>{user.name}</div>
}

// Bad: Using SWR/React Query in Server Component
import useSWR from 'swr'

async function UserProfile({ userId }: { userId: string }) {
  const { data: user } = useSWR(`/api/users/${userId}`, fetcher)

  return <div>{user?.name}</div>
}
```

### Anti-Pattern 2: Another Anti-Pattern Title

[Continue with more anti-patterns...]

## Resources

- [Next.js Documentation](https://nextjs.org/docs) - Official Next.js documentation
- [React Server Components Guide](https://react.dev/reference/react/use-client) - React's official Server Components documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Comprehensive TypeScript documentation
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Complete Tailwind CSS reference
- [shadcn/ui Components](https://ui.shadcn.com/) - Re-usable component library
- [Vercel Examples](https://github.com/vercel/next.js/tree/canary/examples) - Real-world Next.js examples
- [React Patterns](https://reactpatterns.com/) - Common React patterns and best practices
- [TypeScript Playground](https://www.typescriptlang.org/play) - Interactive TypeScript editor

### Content Guidelines

1. **Be Specific**: Avoid vague statements like "write good code"
2. **Provide Examples**: Include both good and bad examples
3. **Explain Why**: Always explain why a rule matters
4. **Be Practical**: Focus on real-world scenarios
5. **Stay Current**: Keep up with latest best practices

### Formatting Guidelines

1. **Use Clear Headings**: Structure your content logically
2. **Include Code Examples**: Show both good and bad patterns
3. **Use Consistent Language**: Write in second person ("You should...")
4. **Keep It Scannable**: Use bullet points and short paragraphs
5. **Add Context**: Explain when and why to apply rules

## AI Agent Conventions

### Cursor

- **Directory**: `.cursor/rules/`
- **File Extension**: `.md`
- **Naming**: `{category}-{subcategory}.md`
- **Format**: Markdown with specific sections

**Example Structure**:

```

.cursor/rules/
├── typescript-strict.md
├── react-server-components.md
├── nextjs-app-router.md
└── tailwind-best-practices.md

```

### Windsurf

- **Directory**: `.windsurf/rules/`
- **File Extension**: `.windsurfrules`
- **Naming**: `{category}.windsurfrules`
- **Format**: Windsurf-specific format

**Example Structure**:

```

.windsurf/rules/
├── typescript.windsurfrules
├── react.windsurfrules
├── nextjs.windsurfrules
└── tailwind.windsurfrules

```

### Future Agents

Each agent can define its own conventions:

- **Aider**: `.aider/rules/{category}.aiderrules`
- **Continue**: `.continue/rules/{category}.continue`
- **Cody**: `.cody/rules/{category}.cody`

## Quality Standards

### Rule Quality Checklist

Before submitting a rule category, ensure:

- [ ] Manifest follows the schema exactly
- [ ] Rules are clear and actionable
- [ ] Examples are comprehensive and relevant
- [ ] Content is well-organized and easy to read
- [ ] Rules cover common use cases and edge cases
- [ ] Content is up-to-date with current best practices
- [ ] README provides clear usage instructions
- [ ] Dependencies and conflicts are properly declared

### Content Standards

1. **Accuracy**: All information must be accurate and current
2. **Completeness**: Cover the most important aspects of the topic
3. **Clarity**: Write in clear, understandable language
4. **Consistency**: Follow established patterns and conventions
5. **Practicality**: Focus on real-world, actionable guidance

### Review Process

1. **Self-Review**: Check your work against the quality checklist
2. **Peer Review**: Have others review your rules
3. **Testing**: Test rules in real projects
4. **Feedback**: Incorporate feedback and iterate
5. **Approval**: Maintainers review and approve

## Contributing

### Adding New Rule Categories

1. **Choose a Category**: Select a specific, well-defined category
2. **Create Directory**: Follow the naming conventions
3. **Write Manifest**: Create a complete manifest.json
4. **Write Rules**: Create comprehensive rule files
5. **Write README**: Document the category
6. **Test Rules**: Use rules in real projects
7. **Submit PR**: Follow the contribution process

### Updating Existing Rules

1. **Identify Changes**: What needs to be updated?
2. **Update Content**: Modify rule files as needed
3. **Update Manifest**: Update version and lastUpdated
4. **Test Changes**: Ensure changes work correctly
5. **Submit PR**: Follow the contribution process

### Reporting Issues

1. **Check Existing Issues**: Look for similar issues first
2. **Create New Issue**: Use the issue template
3. **Provide Details**: Include specific information
4. **Follow Up**: Respond to maintainer questions

## Maintenance

### Regular Updates

- **Monthly**: Review and update rule content
- **Quarterly**: Check for outdated information
- **Annually**: Major review and restructuring

### Version Management

- **Semantic Versioning**: Use SemVer for rule categories
- **Changelog**: Document all changes
- **Backward Compatibility**: Maintain compatibility when possible
- **Migration Guides**: Provide upgrade paths for breaking changes

### Community Management

- **Contributor Onboarding**: Help new contributors get started
- **Code Reviews**: Review all contributions thoroughly
- **Issue Triage**: Prioritize and categorize issues
- **Documentation**: Keep documentation up-to-date

## Tag System

The AI Rules repository uses a comprehensive tagging system to help users find relevant rules based on their tech stack and specific needs.

### Tag Categories

- **Generic Tags**: Broad categorization (`patterns`, `best-practices`, `conventions`, `styling`, `architecture`, `database`, `state-management`)
- **Technology Stack**: Specific technologies (`react`, `nextjs`, `typescript`, `tailwind`, `mongodb`, `shadcn`)
- **Version Tags**: Version-specific features (`nextjs-13`, `nextjs-14`, `nextjs-15`, `react-18`, `react-19`)
- **Feature-Specific**: Specific features or concepts (`server-components`, `app-router`, `search-params`, `document-typing`)
- **Pattern-Specific**: Design patterns (`composition-pattern`, `hooks-pattern`, `context-pattern`, `file-structure`)
- **Quality Tags**: Code quality and process (`type-safety`, `performance-optimization`, `code-quality`, `error-handling`)

### Filtering Examples

- **Next.js 15 + Server Components**: `nextjs-15` + `server-components`
- **React Hooks + Performance**: `react` + `hooks-pattern` + `performance-optimization`
- **TypeScript + Type Safety**: `typescript` + `type-safety` + `strict-mode`
- **Database + MongoDB**: `database` + `mongodb` + `document-typing`
- **Styling + Tailwind**: `styling` + `tailwind` + `shadcn`

### Tag Guidelines

For detailed information about tag naming conventions, selection criteria, and best practices, see [TAG_GUIDELINES.md](./TAG_GUIDELINES.md).

## Resources

### Documentation

- [Manifest Schema Specification](../docs/manifest-schema.md)
- [Contributing Guide](../docs/contributing.md)
- [System Design](../docs/system-design.md)
- [Roadmap](../docs/roadmap.md)
- [Tag Guidelines](./TAG_GUIDELINES.md)

### Tools

- **CLI Tool**: `ai-rules` for managing rules
- **Validation**: JSON schema validation for manifests
- **Testing**: Automated testing for rule quality
- **Linting**: Code quality checks

### Community

- **GitHub Discussions**: Ask questions and share ideas
- **Discord**: Join our community Discord
- **Issues**: Report bugs and request features
- **Pull Requests**: Contribute improvements

## License

All rules in this repository are licensed under the MIT License. See [LICENSE](../LICENSE) for details.

## Support

If you need help with rules or contributing:

1. **Check Documentation**: Look through the docs first
2. **Search Issues**: Look for similar issues
3. **Ask Questions**: Use GitHub Discussions
4. **Contact Maintainers**: Reach out directly if needed

---

**Happy coding with AI Rules!** 🚀
