# Living-spec reminder hook

A `Stop` hook that nudges (never blocks) when a feature-dev session changed code but left the
living spec (`docs/features/<slug>/spec.md`) untouched. Event is `Stop`, not `SubagentStop` —
the orchestrator (`orchestrated-feature-dev`) spawns many sub-agents, and `SubagentStop` would
fire after every one of them, producing a nudge storm mid-pipeline before a spec write was ever
expected. `Stop` fires once, when the top-level session ends.

## Install (manual drop-in)

1. Copy `spec-reminder.mjs` into the target project's `.claude/hooks/spec-reminder/spec-reminder.mjs`.
2. Deep-merge `hook.json`'s `settingsFragment` into the project's `.claude/settings.json` under
   the `hooks` key (append to `hooks.Stop`, don't overwrite an existing array).
3. No other configuration is required — the hook shells out to `git status --porcelain` in the
   `cwd` it receives on stdin; no external config or credentials needed.

## Runtime convention: the sentinel

The hook reads a per-session sentinel file to know whether this session is feature-dev work,
and if so, which spec it expects to see touched:

```
~/.claude/spec-reminder-state/<session_id>.json
```

```json
{ "slug": "my-feature", "specPath": "docs/features/my-feature/spec.md" }
```

- **Written by the feature-dev skill at Phase 0** (`orchestrated-feature-dev/SKILL.md` and
  `feature-dev-lite/SKILL.md`), right after the task `<slug>` is confirmed —
  *before* any code changes happen. Phase 0 is the only timing that makes the nudge meaningful:
  if the sentinel were written later (e.g. at the spec-write step itself), the spec would
  already be "written" by the time the hook could ever check it.
- `specPath` is repo-relative (matches what `git status --porcelain` reports), following the
  `docs/features/<slug>/spec.md` living-spec convention the feature-dev skills write to.
- No sentinel for the session = not a feature-dev session (or the skill didn't wire it) — the
  hook stays completely silent, unlike `kanban-track.mjs` which always emits *some* reminder.
  Whether a session is "feature-dev work" is exactly what's unknown without the sentinel, so
  there is nothing safe to say.

## Behavior on Stop

1. Read stdin (`session_id`, `cwd`).
2. Look up the sentinel for `session_id`.
   - Absent or malformed JSON → silent, exit 0.
3. Run `git status --porcelain --untracked-files=all` in `cwd` (best-effort — a missing `git`
   binary or a `cwd` that isn't a repo is treated as "can't determine," never crashes the hook;
   `--untracked-files=all` matters because a brand-new spec lives in a brand-new
   `docs/features/<slug>/` directory, which git otherwise collapses to a single `?? docs/` line).
   - Clean tree → silent, exit 0 (nothing changed, nothing to remind about).
4. Compare the changed paths against `sentinel.specPath`.
   - `specPath` IS among the changed paths → silent, exit 0 (the spec was touched).
   - `specPath` is NOT among the changed paths (dirty tree, spec untouched) → emit an
     `additionalContext` nudge naming the spec path, then exit 0.

Always exits 0 — exit 2 on a `Stop` hook would block the session from ending, which this hook
must never do.

## Known false positives (accepted for v1 — D14)

The hook has no way to know whether a given code change actually required a spec update (e.g.
a pure refactor, or a change unrelated to the tracked feature). An occasional false-positive
nudge on a legitimate no-spec-change session is accepted for v1; the hook is purely advisory
(non-blocking, always exits 0) so the cost of a false positive is low. No suppression mechanism
exists yet — revisit if false positives erode trust.
