---
description: Build comprehensive repository knowledge by analyzing codebase structure, patterns, and architecture
---

# Repository Knowledge Workflow

This workflow helps build deep understanding of a codebase by systematically exploring its structure, patterns, and architecture.

## Usage

Use this workflow when:

- Starting work on a new codebase
- Need to understand a specific system or module
- Planning major architectural changes
- Creating documentation

## Steps

1. **High-Level Structure**: Analyze directory layout and identify main modules/packages
2. **Entry Points**: Locate main entry files (main.ts, index.ts, app.tsx, etc.)
3. **Dependencies**: Review package.json and understand key dependencies
4. **Patterns Discovery**:
   - File naming conventions
   - Directory organization patterns
   - Common abstractions and utilities
   - State management approach
   - Testing patterns
5. **Architecture Mapping**:
   - Component hierarchy (if frontend)
   - API structure (if backend)
   - Database schema (if applicable)
   - Key data flows
6. **Documentation**: Create markdown file documenting findings:
   - Project overview
   - Architecture diagram (mermaid)
   - Key patterns and conventions
   - Important files and their purposes
   - Testing strategy

## Example Output

```markdown
# Repository Knowledge: [Project Name]

## Overview

Brief description of what the project does

## Architecture

\`\`\`mermaid
graph TD
A[Client] --> B[API]
B --> C[Database]
\`\`\`

## Key Patterns

- File Structure: `[component]/[component].tsx + [component].ui.tsx + [component].state.ts`
- State Management: Zustand with reducer pattern
- Testing: Vitest for unit tests, Playwright for E2E

## Important Files

- `src/index.ts` - Application entry point
- `src/lib/db.ts` - Database connection and utilities
```

## Notes

- Focus on patterns, not individual files
- Document conventions for future reference
- Update as codebase evolves
- Include diagrams for complex architectures
