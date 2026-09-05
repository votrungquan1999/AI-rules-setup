# Skill folder fidelity: `skill.ignore` and the executable bit

A skill is a folder, and the catalog now carries that folder faithfully: only the files the author means to publish, with executable scripts still executable after install. Complements [pull-supporting-files](../pull-supporting-files/spec.md), which made `pull` install the folder at all.

## Behaviors

- **Junk is never published.** `.DS_Store`, `Thumbs.db`, `node_modules/`, `__pycache__/`, `.git/` and `*.pyc` are excluded from every upload with no configuration — a skill folder is a live working directory and accumulates these on its own.
- **An optional `skill.ignore` decides the rest.** Gitignore syntax at the skill root, applied *after* the built-in rules so a `!keep.pyc` line can re-include a default-dropped file. Root-level only; nested ignore files are not consulted.
- **The rules travel with the skill.** `skill.ignore` is published, stored, and installed like any other supporting file, so an installed copy filters identically when someone edits and re-uploads from it. To keep one local, list `skill.ignore` inside itself.
- **Executable files stay executable.** A script that was runnable in the author's folder is runnable after `init`, `add`, `sync`, or `pull` — hooks included. Ordinary files stay non-executable, and a file made executable locally is never chmod'd down.

All four apply to public and private skills alike, and to hooks, because both go through the same collector and the same writer.

## Key files

- [src/app/api/lib/local-fetcher.ts](../../../src/app/api/lib/local-fetcher.ts) — `collectSupportingFiles` builds the matcher (defaults + `skill.ignore`) and records `executable` from the file mode.
- [src/cli/lib/files.ts](../../../src/cli/lib/files.ts) — `writeRuleFile` chmods to 0755 when told to; the single writer every install path uses.
- [src/server/types.ts](../../../src/server/types.ts) — the shared `SupportingFile` interface (`path`, `content`, optional `executable`).
- [tests/lib/collect-supporting-files.test.ts](../../../tests/lib/collect-supporting-files.test.ts) — the collection behaviors, including the install→re-upload round trip.
- [tests/commands/pull.test.ts](../../../tests/commands/pull.test.ts), [tests/e2e/private-skills.test.ts](../../../tests/e2e/private-skills.test.ts) — install-side and full round-trip through the real API and MongoDB.

## Design decisions

- **`skill.ignore` travels rather than being author-side only.** An installed folder is a live working directory where junk reappears and where someone may edit and re-upload; rules kept only in the original source folder would let that re-upload republish the junk.
- **The `ignore` npm package (7.0.8) over hand-rolled globs.** Exact gitignore semantics including negation; zero dependencies. Declared in both `package.json` and `cli-package/package.json` because the collector is shared by the Next server and the published CLI.
- **`executable` is written only when true**, so catalog documents written before the field existed are byte-identical and `exactOptionalPropertyTypes` is satisfied.
- **Install never chmods down.** Restoring a bit is the promise; taking one away would fight a deliberate local change.

## Known gaps

- **Symlinks inside a skill folder are still silently skipped** (`Dirent.isFile()` is false for them). Unchanged by this work; a warning or an explicit follow policy is the natural follow-up.
- **Windows paths.** The matcher receives paths built with the platform separator; gitignore semantics assume `/`. Untested on Windows (CI is Ubuntu, dev is macOS).
- **`executable` is not validated server-side.** The upload route passes it through as the CLI sends it; the shared secret is the only gate.
- **The install loop is still duplicated 4×** (init/add/sync/pull) plus hooks, now each forwarding the flag. `add` also still uses a bare `join` rather than the `resolveWithinDir` guard the others use.
