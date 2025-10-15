# ADR-002: Monorepo Structure (CLI + Rules in Same Repo)

## Status

Accepted

## Context

We need to decide how to organize the AI Rules CLI project. The project consists of:

- CLI tool (TypeScript code)
- Rules repository (Markdown files and manifests)
- Documentation

We need to choose between:

1. Separate repositories for CLI and rules
2. Monorepo with both CLI and rules
3. CLI-only repo that references external rules repo

## Decision

We will use a **monorepo structure** with both CLI and rules in the same repository.

## Rationale

### Monorepo Benefits

- **Simplified Development**: Single repository to clone and work with
- **Atomic Changes**: Can update CLI and rules together in one commit
- **Shared Tooling**: Common CI/CD, linting, and formatting across all code
- **Version Synchronization**: CLI and rules versions stay in sync
- **Easier Onboarding**: New contributors only need to clone one repo

### Alternative Considered: Separate Repositories

**Pros:**

- Clear separation of concerns
- Independent versioning
- Smaller individual repos

**Cons:**

- More complex to manage
- Need to coordinate changes across repos
- Harder to keep CLI and rules in sync
- More repositories to maintain

### Alternative Considered: CLI-Only with External Rules

**Pros:**

- CLI can reference any rules repository
- Rules can be maintained independently
- More flexible for community contributions

**Cons:**

- Harder to ensure rules compatibility
- Need to handle external repository access
- More complex error handling
- Harder to test CLI with rules

## Repository Structure

```
/ai-rules
├── /cli                    # CLI tool source code
│   ├── /src
│   ├── package.json
│   └── tsconfig.json
├── /rules                  # Rules repository
│   ├── /cursor
│   ├── /windsurf
│   └── README.md
├── /docs                   # Documentation
│   ├── /adr
│   ├── system-design.md
│   └── contributing.md
├── README.md
└── .github/workflows       # CI/CD
```

## Consequences

### Positive

- Single source of truth for the entire project
- Easier to maintain consistency between CLI and rules
- Simplified CI/CD pipeline
- Atomic releases of CLI + rules together
- Easier for contributors to understand the full system

### Negative

- Larger repository size
- Need to be careful about what gets included in NPM package
- Potential for tight coupling between CLI and rules

## Implementation Notes

- Use `.npmignore` to exclude `/rules` and `/docs` from CLI package
- Configure GitHub Actions to build and publish only the CLI
- Use workspace tools (like Lerna or npm workspaces) if needed
- Keep rules in `/rules` directory for easy discovery

## Related ADRs

- ADR-001: TypeScript CLI implementation
- ADR-003: Tool-specific folder organization
