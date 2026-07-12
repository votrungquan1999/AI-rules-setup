---
description: Inventory and migration map from Claude Code + Antigravity assets to Cursor-native features
---

# Cursor Porting Analysis

## 1) Source Inventory

### Antigravity

- Skills: `bdd-design`, `code-refactoring`, `context7`, `create-implementation-plan`, `create-pr`, `find-patterns`, `orchestrated-feature-dev`, `root-cause-analysis`, `tdd-design`, `test-quality-reviewer`, `web-search`
- Workflows: `commit-plan`, `feature-development`, `repo-knowledge`, `review-changes`, `structured-brainstorming`

### Claude Code

- Skills include all core engineering skills above plus:
  - `commit-plan`
  - `feature-dev-lite`
  - `repo-knowledge`
  - `review-changes`
  - `structured-brainstorming`
  - `validate-pr-comments`

## 2) Cursor Features Relevant to Porting

Based on Cursor docs and built-in Cursor skills:

- Skills (`.cursor/skills/**/SKILL.md`, `.agents/skills/**/SKILL.md`)
  - Best for reusable multi-step procedures.
  - Supports optional `paths` scoping and `disable-model-invocation`.
- Rules (`.cursor/rules/*.mdc`)
  - Best for always-on coding conventions and file-pattern guidance.
- Hooks (`.cursor/hooks.json` + scripts under `.cursor/hooks/`)
  - Best for automated guardrails and event-driven checks (e.g., before shell execution, after file edit).
- MCP config (`.cursor/mcp.json`)
  - Best for external tool/data integrations used by skills and agent flows.
- Plan Mode / subagents / multitask
  - Strong fit for complex workflow orchestration; mostly runtime behavior rather than static repo files.
- Notepads
  - Persistent context docs; typically user/workspace tooling, not standard repo artifact.
- CLI status line (`~/.cursor/cli-config.json`)
  - Personal/global ergonomics; not usually repo-scoped.
- SDK (`@cursor/sdk`, `cursor-sdk`)
  - Programmatic automation path for cloud/local agents and CI integration.

## 3) What Was Ported to Cursor Skills in This Repo

Created under `skills/cursor/` (full Claude/Antigravity parity set):

- `bdd-design`
- `code-refactoring`
- `commit-plan`
- `context7`
- `create-implementation-plan`
- `create-pr`
- `feature-dev-lite`
- `find-patterns`
- `orchestrated-feature-dev` (+ `nodes/` templates)
- `repo-knowledge`
- `review-changes`
- `root-cause-analysis`
- `structured-brainstorming`
- `tdd-design`
- `test-quality-reviewer`
- `validate-pr-comments`
- `web-search`

## 4) Non-Skill Template Pack (Repo Assets)

For this repository's distribution model, non-skill Cursor features should be provided as **copy-ready templates**, not as active `.cursor/` config in this repo.

Suggested pack structure:

1. `templates/cursor/hooks/`
   - `hooks.json.template`
   - `hooks/pre-shell-safety.sh`
   - `hooks/post-edit-quality.sh`
   - Purpose: event-driven guardrails and automation.

2. `templates/cursor/mcp/`
   - `mcp.json.template`
   - `README.md` with token/env placeholders
   - Purpose: standardized external integrations for skills.

3. `templates/cursor/agents/`
   - `researcher.md`
   - `reviewer.md`
   - `validator.md`
   - Purpose: reusable subagent definitions for orchestration.

4. `templates/cursor/rules/`
   - `workflow-gates.mdc`
   - `testing-enforcement.mdc`
   - `review-quality.mdc`
   - Purpose: always-on behavioral constraints that complement skills.

## 5) Fit Guide

- Put **procedures** in skills.
- Put **always-on conventions** in rules.
- Put **automatic checks/gates** in hooks.
- Put **external system connectivity** in MCP config.
