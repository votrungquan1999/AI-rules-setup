---
name: setup-private-skills
description: Sets up scoped private skills for a project so the AI Rules CLI pulls them alongside public skills. Use when configuring private/team skills, sharing a skill privately, wiring up AI_RULES_SECRET + scope, or when the user says "set up private skills", "install private skills", "pull our private skills", or "upload a private skill".
allowed-tools: Read, Bash, Edit, Write
---

# Set Up Private Skills

Configure a project so the AI Rules CLI (`@quanvo99/ai-rules`) fetches **private, scoped** skills together with the public ones — and, when asked, publish a local skill privately under one or more scopes.

## When to Use

- A project should receive skills that aren't public (team- or client-specific).
- The user wants to share a local skill privately rather than to the public catalog.
- Private skills "aren't showing up" after a pull and you need to diagnose the secret/scope wiring.

## How It Works (the contract)

Two pieces of state unlock private skills, and **both** are required:

- `AI_RULES_SECRET` — a shared secret in the environment. The CLI sends it as the `x-ai-rules-secret` header.
- `scope` — a tag in `.ai-rules.json`. The CLI sends it as the `x-ai-rules-scope` header.

The server merges any private skill whose scopes include the request scope, marking it `visibility: "private"`; public skills come back regardless. On **any** auth failure the server silently degrades to the public-only payload — there is no error and no "exists" leak. So:

- Secret set, no scope → public skills only.
- Scope set, no secret → public skills only (scope alone unlocks nothing).
- Both set and matching → public + scoped private skills.

The practical consequence: **if private skills don't appear, it fails silently** — re-check the secret value and the scope rather than looking for an error message.

## Prerequisites

1. CLI **≥ 0.2.0** (the version that added `upload` + scoped `pull`). Check with `npx @quanvo99/ai-rules --version`.
2. The `AI_RULES_SECRET` value, obtained from whoever owns the deployment's secret store. **Never commit it.**
3. A scope tag decided for this project (e.g. `personal`, `work`, `client-x`).

## Steps

### 1. Identify the agent

Read `.ai-rules.json` at the project root and note the `agent` field. Private skills are supported for `claude-code`, `cursor`, and `antigravity`. If there is no `.ai-rules.json`, run `npx @quanvo99/ai-rules init` first and pick the agent.

### 2. Make the secret available to the CLI

The CLI reads `process.env.AI_RULES_SECRET`. Export it in the shell for the session, or add it to a git-ignored `.env` the CLI process can see:

```bash
export AI_RULES_SECRET='<value-from-secret-store>'
```

Confirm `.env` (or the file holding it) is in `.gitignore`. Never print the value into committed files or logs.

### 3. Set the scope in `.ai-rules.json`

Add a `scope` field (string) at the top level:

```json
{
  "agent": "claude-code",
  "scope": "personal",
  "skills": []
}
```

Without `scope`, private skills are **never** fetched — this is the most common reason they don't appear.

### 4. (Optional) Upload a local skill privately

Only when the user wants to publish a skill privately. The directory must contain a `SKILL.md`; any other files become supporting files.

```bash
AI_RULES_SECRET='<value>' npx @quanvo99/ai-rules upload ./path/to/skill-dir \
  --agent claude-code \
  --scope personal          # comma-separated; at least one scope required
```

The skill name is the directory's basename. Re-uploading the same `{agent, name}` upserts (replaces) it.

### 5. Pull

With the secret in the environment and `scope` in config, pull brings down public + scoped private skills:

```bash
npx @quanvo99/ai-rules pull
```

`add` works the same way — both thread the configured `scope` through every fetch.

### 6. Verify

- The private skill's files appear under the agent's skills path: `claude-code` → `.claude/skills/<name>/SKILL.md`, `cursor` → `.cursor/skills/<name>/SKILL.md`, `antigravity` → `.agents/skills/<name>/SKILL.md`.
- If nothing private arrived, run through the silent-failure checklist below.

## Troubleshooting (silent failures)

Private skills missing after a pull, with no error:

1. Is `AI_RULES_SECRET` actually exported in the same shell running the CLI? (`echo ${AI_RULES_SECRET:+set}` → should print `set`.)
2. Does the value match the server's secret **exactly**? The compare is byte-for-byte and constant-time; a trailing newline or quote breaks it.
3. Is `scope` present in `.ai-rules.json`, and does it match a scope the skill was uploaded under?
4. Is the CLI ≥ 0.2.0? Older versions ignore scope entirely.

## Safety

- The secret grants read access to every private skill in your scope — treat it like a password.
- Never commit it, never paste it into a skill body, never echo it in shared logs.
