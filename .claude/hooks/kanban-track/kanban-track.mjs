#!/usr/bin/env node
// Claude Code UserPromptSubmit hook for AI-Kanban tracking. Reads the hook JSON on
// stdin and injects a card-status + record-keeping reminder via additionalContext —
// the agent does the recording, in its own words, not this hook mechanically.
// Always exits 0 — exit 2 would erase the user's prompt.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Search-first, not create-first: a session with no pointer is usually a resumed
// one (compact, restart), and its card already exists.
const NO_POINTER_REMINDER =
  "No AI-Kanban card is active for this session. If this prompt starts substantive, multi-step work, search the board first (list_cards with text) for an existing card covering it — continue on that card if you find one, and open a new card only if you don't.";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}

// Pointer written by the model right after create_card; absent = no active card.
function readPointer(sessionId) {
  if (!sessionId) return null;
  try {
    const path = join(homedir(), ".claude", "kanban-session-state", `${sessionId}.json`);
    const pointer = JSON.parse(readFileSync(path, "utf8"));
    const hasRequiredFields =
      typeof pointer.cardId === "string" &&
      typeof pointer.cardNumber === "number" &&
      typeof pointer.summary === "string";
    return hasRequiredFields ? pointer : null;
  } catch {
    return null;
  }
}

// Fires on every prompt, so the record-keeping ask must be conditional — only when something
// notable actually happened — or it just trades verbatim noise for agent-generated noise. The
// hook only knows session_id/cwd, never the task workspace path, so instructions refer to "your
// task workspace" generically rather than interpolating or inventing an absolute path.
//
// D18/D19 routing: each entry type has exactly one home, never the journal for the two that
// already have a dedicated file/tool — decisions and transitions would otherwise be recorded twice.
function buildReminder(pointer) {
  if (!pointer) return NO_POINTER_REMINDER;
  return `Active AI-Kanban card #${pointer.cardNumber} (${pointer.summary}). ` +
    "If something notable just happened, record it in your task workspace: a decision (with why) -> " +
    "append_decision + DECISIONS.md; a step finishing/starting -> IMPLEMENTATION_PROGRESS.md; an open " +
    "question, a finding, or a reusable command -> JOURNAL.md (append). Diverged into a distinct task? " +
    "create_card with forceNew:true.";
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
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

  const pointer = readPointer(input.session_id);
  emit(buildReminder(pointer));
  process.exit(0);
}

// Belt-and-suspenders: an unexpected error must never crash the hook or exit non-zero
// (exit 2 erases the user's prompt) — per-function try/catches already cover the known
// failure modes; this is the final backstop.
main().catch(() => process.exit(0));
