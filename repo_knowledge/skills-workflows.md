# Skills & Workflows System

This document describes how skills and workflows are organized, managed, and installed alongside rules.

**Related Documentation:**
- [CLI Flows](./cli-flows.md) - How skills/workflows are installed via CLI
- [Rule System](./rule-system.md) - How rules (the original content type) are organized
- [Data Types](./data-types.md) - Type definitions for skills/workflows config

## Overview

Skills and workflows are higher-level content types that extend beyond simple rule files:

- **Skills** — Reusable capability packages (e.g., TDD, BDD, code refactoring) with detailed instructions in a `SKILL.md` file
- **Workflows** — Step-by-step procedural guides (e.g., feature development, commit planning) defined as markdown files with YAML frontmatter

Both are agent-specific: different AI agents may have different skills/workflows available, and the installation paths differ per agent.

## Repository Structure

### Skills

```
/skills
  /antigravity
    /bdd-design/SKILL.md
    /code-refactoring/SKILL.md
    /context7/SKILL.md
    /create-implementation-plan/SKILL.md
    /tdd-design/SKILL.md
    /test-quality-reviewer/SKILL.md
    /web-search/SKILL.md
  /claude-code
    /bdd-design/SKILL.md
    /code-refactoring/SKILL.md
    /context7/SKILL.md
    /create-implementation-plan/SKILL.md
    /web-search/SKILL.md
```

### Workflows

```
/workflows
  /antigravity
    /commit-plan.md
    /feature-development.md
    /repo-knowledge.md
    /review-changes.md
    /structured-brainstorming.md
```

Currently, workflows are only defined for the Antigravity agent.

## API Response Structure

Skills and workflows are served alongside rule categories in the same API response:

```typescript
interface RulesResponse {
  agents: {
    [agentName: string]: {
      categories: { ... };        // Rule categories (existing)
      skills?: Array<{            // Optional skills array
        name: string;             // e.g., "tdd-design"
        content: string;          // Full SKILL.md content
      }>;
      workflows?: Array<{         // Optional workflows array
        name: string;             // e.g., "feature-development"
        content: string;          // Full workflow .md content
      }>;
    };
  };
}
```

Skills and workflows are optional fields — agents that don't have them simply omit the keys.

## Installation Paths

### Antigravity Agent

Skills are installed to the Antigravity SKILL.md subdirectory structure:

```
.agent/skills/<skill-name>/SKILL.md
```

Workflows are installed to:

```
.agent/workflows/<workflow-name>.md
```

### Claude Code Agent

Skills use the `SKILL.md` subdirectory structure under the agent's CLAUDE.md convention:

```
.claude/skills/<skill-name>/SKILL.md   (or similar per conventions)
```

### Other Agents

Agents like Cursor, Windsurf, etc. currently do not have skills/workflows defined. The CLI gracefully handles this by returning empty arrays from `fetchSkills()` / `fetchWorkflows()`.

## Config Tracking

Installed skills and workflows are tracked in `.ai-rules.json` alongside categories:

```json
{
  "version": "1.0.0",
  "agent": "antigravity",
  "categories": ["typescript-strict"],
  "skills": ["tdd-design", "bdd-design", "context7"],
  "workflows": ["feature-development", "commit-plan"]
}
```

The `skills` and `workflows` fields are optional arrays. The `addSkill()` and `addWorkflow()` helpers in `src/cli/lib/config.ts` handle immutable deduplication.

## CLI Flags

### `init` command

| Flag | Description |
|---|---|
| `--skills <list>` | Comma-separated skill names to install |
| `--no-skills` | Skip skill installation entirely |
| `--workflows <list>` | Comma-separated workflow names to install |
| `--no-workflows` | Skip workflow installation entirely |
| `--no-categories` | Skip category (rules) installation entirely |

When no flags are provided and a TTY is available, the CLI prompts interactively for skill and workflow selection.

### `pull` command

The `pull` command reads the existing config and re-installs all tracked skills/workflows. No interactive prompts — it uses the force overwrite strategy by default.

## Interactive Selection

Interactive prompts (only when `process.stdin.isTTY` is truthy):

1. **Skill selection** — Checkbox prompt with "🎯 Select All" option
2. **Workflow selection** — Checkbox prompt with "⚡ Select All" option

Both use the same pattern as the existing category selection: a `__ALL__` sentinel value handles "Select All", and empty selection is allowed (no validation constraint, unlike categories).

## Key Architectural Decisions

1. **TTY guard** — Interactive prompts are gated behind `process.stdin.isTTY` to prevent hangs in CI/CD, piped commands, or non-interactive test environments.

2. **Graceful degradation** — If a skill/workflow is not found during `pull`, the error is logged but the operation continues for remaining items.

3. **Same cache** — Skills and workflows share the same API cache as rules (`fetchRulesData()`), so a single API call fetches all content types.

4. **Agent-specific paths** — `applySkillNamingConvention()` in `src/cli/lib/files.ts` handles per-agent skill installation paths, while workflows always go to `.agent/workflows/`.
