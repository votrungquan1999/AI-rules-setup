#!/usr/bin/env node
// Claude Code Stop hook: nudges (never blocks) when a feature-dev session changed code but
// left the living spec untouched. Reads the hook JSON on stdin, checks a session-scoped
// sentinel the feature-dev skill drops at Phase 0, and — only when the sentinel is present,
// the git tree is dirty, and the sentinel's spec path is NOT among the changed paths — emits
// an additionalContext nudge. Always exits 0 — exit 2 on Stop would block the session from
// ending.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}

// Sentinel written by the feature-dev skill at Phase 0 (D7), naming the spec path this
// session is expected to touch. Absent = not a feature-dev session; stay silent.
function readSentinel(sessionId) {
  if (!sessionId) return null;
  try {
    const path = join(homedir(), ".claude", "spec-reminder-state", `${sessionId}.json`);
    const sentinel = JSON.parse(readFileSync(path, "utf8"));
    const hasRequiredFields =
      typeof sentinel.slug === "string" &&
      typeof sentinel.specPath === "string";
    return hasRequiredFields ? sentinel : null;
  } catch {
    return null;
  }
}

// Repo-relative changed paths from `git status --porcelain` in cwd, or null if the command
// fails (git missing, cwd not a repo) — treated as "can't determine, stay silent".
// --untracked-files=all: a brand-new spec.md typically lives in a brand-new
// docs/features/<slug>/ directory; without this flag git collapses the whole untracked
// directory into a single "?? docs/" line instead of listing the leaf file.
function changedPaths(cwd) {
  try {
    const output = execSync("git status --porcelain --untracked-files=all", { cwd, encoding: "utf8" });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const withoutStatus = line.slice(3);
        // Renames report as "old -> new"; the new path is what matters for "was it touched".
        const arrowIndex = withoutStatus.indexOf(" -> ");
        return arrowIndex === -1 ? withoutStatus : withoutStatus.slice(arrowIndex + 4);
      });
  } catch {
    return null;
  }
}

function buildNudge(specPath) {
  return (
    `Code changed this session but ${specPath} wasn't touched. ` +
    "If this work changed feature behavior, update the living spec before wrapping up."
  );
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext,
    },
  }));
}

async function main() {
  let input = {};
  try {
    input = JSON.parse(await readStdin());
  } catch {
    input = {};
  }

  const sentinel = readSentinel(input.session_id);
  if (!sentinel) {
    process.exit(0);
    return;
  }

  const changed = changedPaths(input.cwd);
  if (!changed || changed.length === 0) {
    process.exit(0); // clean tree, or git status couldn't be determined — nothing to nudge about
    return;
  }

  if (changed.includes(sentinel.specPath)) {
    process.exit(0); // the living spec was already part of this session's changes
    return;
  }

  emit(buildNudge(sentinel.specPath));
  process.exit(0);
}

// Belt-and-suspenders: an unexpected error must never crash the hook or exit non-zero
// (exit 2 on Stop blocks the session from ending) — per-function try/catches already cover
// the known failure modes; this is the final backstop.
main().catch(() => process.exit(0));
