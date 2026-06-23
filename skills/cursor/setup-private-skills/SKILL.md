---
name: setup-private-skills
description: Configure scoped private skills so the AI Rules CLI pulls them alongside public skills, publish a local skill privately under one or more scopes, and capture the current conversation as a new reusable skill. Use when wiring AI_RULES_SECRET + scope, sharing team/client skills, diagnosing missing private skills, or when the user says "set up private skills", "upload a private skill", "record this as a skill", or "capture this conversation as a skill".
---

# Set Up Private Skills

Configure a project so the AI Rules CLI (`@quanvo99/ai-rules`) fetches **private, scoped** skills together with the public ones — publish a local skill privately under one or more scopes, or capture the current conversation as a brand-new skill and publish it.

## When to Use

- A project should receive skills that aren't public (team- or client-specific).
- The user wants to share a local skill privately rather than to the public catalog.
- The user wants to **capture the current conversation** (a procedure you just worked out) as a new reusable skill and publish it privately.
- Private skills "aren't showing up" after a pull and you need to diagnose the secret/scope wiring.

## How It Works (the contract)

Two pieces of state unlock private skills, and **both** are required:

- `AI_RULES_SECRET` — a shared secret in the environment. The CLI sends it as the `x-ai-rules-secret` header.
- `scope` — a tag (or tags) in `.ai-rules.json`. The CLI sends them as the `x-ai-rules-scope` header.

The server merges any private skill whose scopes **intersect** the request scopes, marking it `visibility: "private"`; public skills come back regardless. On **any** auth failure the server silently degrades to the public-only payload — there is no error and no "exists" leak. So:

- Secret set, no scope → public skills only.
- Scope set, no secret → public skills only (scope alone unlocks nothing).
- Both set and matching → public + scoped private skills.

The practical consequence: **if private skills don't appear, it fails silently** — re-check the secret value and the scope rather than looking for an error message.

## Prerequisites

1. CLI **≥ 0.2.0** for `upload` + scoped `pull` (≥ 0.2.1 for `sync`). Check with `npx @quanvo99/ai-rules --version`.
2. The `AI_RULES_SECRET` value, obtained from whoever owns the deployment's secret store. **Never commit it.**
3. A scope tag decided for this project (e.g. `personal`, `work`, `client-x`).

## Steps

### 1. Identify the agent

Read `.ai-rules.json` at the project root and note the `agent` field. Private skills are supported for `claude-code`, `cursor`, and `antigravity`. If there is no `.ai-rules.json`, run `npx @quanvo99/ai-rules init` first and pick the agent.

### 2. Make the secret available to the CLI

The CLI reads `process.env.AI_RULES_SECRET`. Export it in the shell — ideally from a shell profile so every session has it — or add it to a git-ignored `.env` the CLI process can see:

```bash
export AI_RULES_SECRET='<value-from-secret-store>'
```

Never print the value into committed files or logs.

### 3. Set the scope in `.ai-rules.json`

Add a `scope` field — an **array** of tags — at the top level:

```json
{
  "agent": "cursor",
  "scope": ["personal"],
  "skills": []
}
```

A project can carry several scopes (e.g. `["personal", "ai-kanban"]`) and receives any private skill whose scopes intersect. A legacy single string is still accepted and coerced to a one-element array. Without `scope`, private skills are **never** fetched — the most common reason they don't appear.

### 4. (Optional) Publish a skill privately

When the user wants to share a skill privately — either an existing local skill or one captured from the current conversation.

**4a. Author the skill (when capturing from a conversation).** Skip if the skill directory already exists.

- Distill the reusable *method* from the conversation — generalize away the one-off specifics of this instance.
- Write `<skills-dir>/<skill-name>/SKILL.md` for the configured agent (`.claude/skills`, `.cursor/skills`, or `.agents/skills`). `<skill-name>` is short kebab-case. Frontmatter needs `name` and a one-line `description` that states what it does AND when to use it (the trigger phrases). Keep the body skimmable; add supporting files in the directory if the procedure needs references.
- 🛑 **Stop and show the user the SKILL.md (and the exact upload command below) and wait for explicit approval before uploading.**

**4b. Upload.** The directory must contain a `SKILL.md`; any other files become supporting files.

```bash
AI_RULES_SECRET='<value>' npx @quanvo99/ai-rules upload ./path/to/skill-dir \
  --agent cursor \
  --scope personal          # comma-separated; a skill can carry multiple scopes
```

The skill name is the directory's basename. Re-uploading the same `{agent, name}` upserts (replaces) it.

### 5. Pull

With the secret in the environment and `scope` in config, pull brings down public + scoped private skills:

```bash
npx @quanvo99/ai-rules pull
```

`add` and `sync` thread the configured `scope` the same way — `sync` force-installs the full available catalog, so use it to reconcile a project to everything its scope unlocks.

### 6. Verify

- The private skill's files appear under the agent's skills path: `claude-code` → `.claude/skills/<name>/SKILL.md`, `cursor` → `.cursor/skills/<name>/SKILL.md`, `antigravity` → `.agents/skills/<name>/SKILL.md`.
- If nothing private arrived, run through the silent-failure checklist below.

## Troubleshooting (silent failures)

Private skills missing after a pull, with no error:

1. Is `AI_RULES_SECRET` actually available in the shell running the CLI? (`echo ${AI_RULES_SECRET:+set}` → should print `set`.)
2. Does the value match the server's secret **exactly**? The compare is byte-for-byte and constant-time; a trailing newline or quote breaks it.
3. Is `scope` present in `.ai-rules.json`, and does it intersect a scope the skill was uploaded under?
4. Is the CLI ≥ 0.2.0? Older versions ignore scope entirely.

## Safety

- The secret grants read access to every private skill in your scope — treat it like a password.
- Never commit it, never paste it into a skill body, never echo it in shared logs.
