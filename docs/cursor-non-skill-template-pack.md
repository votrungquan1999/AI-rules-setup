---
description: Proposed Cursor non-skill template pack for downstream repository setup
---

# Cursor Non-Skill Template Pack

## Goal

Provide copy-ready Cursor templates as distributable repository assets, so downstream projects can adopt Cursor-native capabilities beyond skills.

This pack is intentionally **template-based** (not active runtime config in this repo), matching this project's distribution model.

## Why this exists

`skills/cursor/` covers reusable procedures.  
Many Cursor capabilities are stronger when represented in other primitives:

- **Rules** for always-on guidance
- **Hooks** for automatic guardrails and checks
- **MCP config** for external integrations
- **Subagents** for orchestration and parallel workflow execution

## Proposed Template Structure

```text
templates/cursor/
├── hooks/
│   ├── hooks.json.template
│   ├── scripts/
│   │   ├── pre-shell-safety.sh
│   │   └── post-edit-quality.sh
│   └── README.md
├── mcp/
│   ├── mcp.json.template
│   └── README.md
├── agents/
│   ├── researcher.md
│   ├── investigator.md
│   ├── validator.md
│   └── README.md
└── rules/
    ├── workflow-gates.mdc
    ├── testing-enforcement.mdc
    ├── review-quality.mdc
    └── README.md
```

## Template Pack Contents

### 1) Hooks templates

Purpose: event-driven automation and safety enforcement.

- `hooks.json.template`
  - baseline events (`beforeShellExecution`, `afterFileEdit`, optional `beforeMCPExecution`)
- `scripts/pre-shell-safety.sh`
  - block/ask confirmation for risky shell patterns
- `scripts/post-edit-quality.sh`
  - run scoped checks after file edits (lint/test entrypoint)

Maps from current assets:
- `commit-plan`
- `review-changes`
- `test-quality-reviewer`
- `feature-dev-lite`

### 2) MCP templates

Purpose: standard integration profile for Cursor agents and skills.

- `mcp.json.template`
  - placeholder servers with env-driven credentials
  - optional examples for docs/research integrations
- `README.md`
  - server setup notes
  - expected environment variables
  - auth checklist

Maps from current assets:
- `context7`
- `web-search`
- `orchestrated-feature-dev`

### 3) Subagent templates

Purpose: reusable specialist agents for parallelized and isolated phases.

- `researcher.md`
- `investigator.md`
- `validator.md`
- `README.md` (handoff and coordination conventions)

Maps from current assets:
- `orchestrated-feature-dev` (+ nodes)
- `root-cause-analysis`
- `review-changes`

### 4) Rule templates

Purpose: always-on constraints that should not rely on explicit skill invocation.

- `workflow-gates.mdc`
  - requires plan/approval gates for complex changes
- `testing-enforcement.mdc`
  - one-test-at-a-time and run-before-implement constraints
- `review-quality.mdc`
  - review format, severity semantics, and quality bars

Maps from current assets:
- `tdd-design`
- `bdd-design`
- `create-implementation-plan`
- `review-changes`

## Fit Guide (what goes where)

- **Skills**: task procedures invoked explicitly or by relevance.
- **Rules**: persistent conventions and constraints.
- **Hooks**: automatic execution-time controls and checks.
- **MCP**: external tool/documentation/data connectivity.
- **Subagents**: isolated parallel work units.

## Suggested rollout order

1. `templates/cursor/rules/` (policy baseline)
2. `templates/cursor/hooks/` (guardrails)
3. `templates/cursor/mcp/` (integration baseline)
4. `templates/cursor/agents/` (orchestration expansion)

This sequence provides immediate reliability while minimizing setup complexity for downstream users.
