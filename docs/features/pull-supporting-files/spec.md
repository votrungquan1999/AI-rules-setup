# `pull` installs whole skill folders

`ai-rules pull` re-installs every skill listed in `.ai-rules.json`. A skill is a folder — `SKILL.md` plus any supporting files (`steps/*.md`, `nodes/*.md`, scripts, references) — and `pull` now writes all of it, the same way `sync`, `add`, and `init` already did. Before this change `pull` wrote only `SKILL.md` and silently dropped the rest, which made private skills with supporting files look "incomplete" after the recommended `pull` workflow.

## Behaviors

- **Supporting files land beside `SKILL.md`.** A developer who runs `pull` gets every supporting file the catalog ships for a skill, nested folders included, with content byte-identical to the catalog. Applies to public and private skills alike — they share one payload shape.
- **A catalog path cannot escape the project.** A supporting-file path such as `../../../../x` is refused and the pull rejects (fail-closed, matching `sync`). Nothing is written outside the project directory.
- **Private scoped skills are covered end-to-end.** With `AI_RULES_SECRET` and a matching `scope`, `pull` installs a private skill's supporting files under `.claude/skills/<name>/…`. The e2e scenario asserts this against the real API + MongoDB (`npm run test:e2e -- tests/e2e/private-skills.test.ts`).

## Key files

- [src/cli/commands/pull.ts](../../../src/cli/commands/pull.ts) — the skill install loop (supporting files via `applySkillFileNamingConvention` + `resolveWithinDir`).
- [src/cli/lib/files.ts](../../../src/cli/lib/files.ts) — `applySkillFileNamingConvention`, `resolveWithinDir`.
- [tests/commands/pull.test.ts](../../../tests/commands/pull.test.ts) — unit scenarios (install + path-escape refusal).
- [tests/e2e/private-skills.test.ts](../../../tests/e2e/private-skills.test.ts) — "running pull in a project with a matching scope" now asserts a supporting file.

## Commits

- `fix(cli): pull installs skill supporting files alongside SKILL.md`
- `fix(cli): pull refuses skill supporting files that escape the project dir`
- `test(e2e): pull scenario asserts a private skill's supporting file lands`

## Known gaps / follow-ups

Out of scope for this change; each should become its own card when picked up.

- **Executable bit is not preserved.** Files are written 0644 by every install command, so a `scripts/run.sh` loses `+x`. Direction: optional `executable?: boolean` on the shared supporting-file entry (`SkillFile.supportingFiles[]` / `HookFile.supportingFiles[]` in `src/server/types.ts`), set from `stat().mode` at upload, `chmod` on install. Byte-identical for existing documents.
- **No `skill.ignore`.** `collectSupportingFiles` uploads everything in the skill dir (`.DS_Store`, `node_modules/`, scratch files) and silently skips nested symlinks. Direction: optional `skill.ignore` at the skill root (gitignore syntax), always-on defaults for junk, explicit symlink policy, plus guidelines in `setup-private-skills` on what belongs in a skill folder.
- **Reviewer UI shows no file structure.** `PrivateSkillDisplay` / `GET /api/skills` omit `supportingFiles`; the page edits only `SKILL.md`. Direction: include paths + text content in the page payload, render a collapsible tree per card with a read-only viewer. No decoding needed — the data is already structured in Mongo.
- **Install loop is duplicated 4×** (init/add/sync/pull) with small differences (conflict prompts, target dir, logging; `add` still uses bare `join`). Candidate for a shared helper if a fifth caller appears or when `add` gets the same path guard.
- **Rejected alternative:** base64-encoding the whole folder as one blob. Opaque to the server and UI, breaks the one-field `PATCH content` edit, +33% size against Mongo's 16 MB document cap, and forks the public/private model. The per-file list already carries the whole folder.
