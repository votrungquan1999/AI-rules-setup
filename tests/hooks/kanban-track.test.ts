import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Black-box tests for the SHIPPED hook artifact: spawn the real .mjs and assert its stdin -> stdout
// behavior. The hook is a zero-dependency standalone script, so we exercise it as Claude Code would
// (a JSON payload on stdin, additionalContext on stdout) rather than importing it.
const ARTIFACT_DIR = join(__dirname, "../../hooks/claude-code/kanban-track");
const HOOK_PATH = join(ARTIFACT_DIR, "kanban-track.mjs");
const HOOK_JSON_PATH = join(ARTIFACT_DIR, "hook.json");
const README_PATH = join(ARTIFACT_DIR, "README.md");

/** Asserts the no-pointer reminder's MEANING: track only work worth revisiting, judged from what
 * the work has already produced, and check the repo's open cards before creating. With no card
 * there is no task workspace either, so this branch must not reference any recording mechanism
 * (card write tools or workspace files).
 * Not a full-string match — the exact wording is expected to keep getting tuned. */
function expectNoPointerReminder(context: string): void {
	expect(context).toContain("No AI-Kanban card is active for this session");
	// The gate is durability, not effort: a card no one returns to is noise on the board.
	expect(context).toContain("revisit this work a week from now");
	// Retrospective, because at prompt time the size of the work is least knowable.
	expect(context).toContain("already produced");
	// Keyword search finds the same task; only the repo tag finds the card this belongs under.
	expect(context).toContain("tagged with this repo");
	// No card exists to append to, and no workspace exists to hold a journal — nothing to dangle.
	expect(context).not.toContain("append_progress");
	expect(context).not.toContain("append_decision");
	expect(context).not.toContain("JOURNAL.md");
	// Operator's explicit constraint: never point at Claude Code's own config directory.
	expect(context).not.toContain(".claude/");
	expect(context).not.toContain("$HOME");
}

interface HookResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

/** Spawns the hook with a stdin payload + env overrides; resolves once it exits. */
function runHook(input: Record<string, unknown> | string, env: Record<string, string>): Promise<HookResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [HOOK_PATH], {
			env: { ...process.env, ...env },
			stdio: ["pipe", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode }));

		child.stdin.write(typeof input === "string" ? input : JSON.stringify(input));
		child.stdin.end();
	});
}

/** Writes the session pointer under `<home>/.claude/kanban-session-state/<sessionId>.json`. */
function writePointerFixture(home: string, sessionId: string, pointer: Record<string, unknown>): void {
	const dir = join(home, ".claude", "kanban-session-state");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `${sessionId}.json`), JSON.stringify(pointer));
}

describe("kanban-track hook (shipped artifact)", () => {
	let home: string;

	afterEach(() => {
		if (home) rmSync(home, { recursive: true, force: true });
	});

	function makeHome(): string {
		home = mkdtempSync(join(tmpdir(), "kanban-hook-test-"));
		return home;
	}

	it("no pointer for the session -> emits an open-a-card reminder only (no card, no workspace, nothing to record into)", async () => {
		makeHome();
		const { stdout, exitCode } = await runHook(
			{
				session_id: "sess-no-pointer",
				prompt: "do something",
				hook_event_name: "UserPromptSubmit",
				cwd: "/tmp/project",
			},
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		const output = JSON.parse(stdout);
		expect(output.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
		expectNoPointerReminder(output.hookSpecificOutput.additionalContext);
	});

	it("pointer present -> names the active card and routes each entry type to its own workspace file/tool", async () => {
		makeHome();
		writePointerFixture(home, "sess-with-pointer", {
			cardNumber: 42,
			cardId: "0123456789abcdef01234567",
			summary: "wire the hook",
		});

		const { stdout, exitCode } = await runHook(
			{
				session_id: "sess-with-pointer",
				prompt: "next step",
				hook_event_name: "UserPromptSubmit",
				cwd: "/tmp/project",
			},
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		const context = JSON.parse(stdout).hookSpecificOutput.additionalContext;
		expect(context).toContain("Active AI-Kanban card #42 (wire the hook)");
		expect(context).toContain("notable");
		// D18/D19 routing: decisions go to the card tool + their own file, never the journal.
		expect(context).toContain("append_decision");
		expect(context).toContain("DECISIONS.md");
		// Transitions get their own progress file — not the journal, not append_progress.
		expect(context).toContain("IMPLEMENTATION_PROGRESS.md");
		// The remaining types (question/finding/artifact) share one append-only workspace journal.
		expect(context).toContain("JOURNAL.md");
		expect(context).toContain("create_card with forceNew:true");
		// Operator's explicit constraint: never point at Claude Code's own config directory.
		expect(context).not.toContain(".claude/");
		expect(context).not.toContain("$HOME");
	});

	it("malformed pointer JSON -> degrades to the open-a-card reminder and exits 0 (never crashes)", async () => {
		makeHome();
		const stateDir = join(home, ".claude", "kanban-session-state");
		mkdirSync(stateDir, { recursive: true });
		writeFileSync(join(stateDir, "sess-corrupt.json"), "{ not valid json");

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-corrupt", prompt: "do something", hook_event_name: "UserPromptSubmit", cwd: "/tmp/project" },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		expectNoPointerReminder(JSON.parse(stdout).hookSpecificOutput.additionalContext);
	});

	it("hook.json's settingsFragment matches Claude Code's nested schema and targets the shipped script", () => {
		const manifest = JSON.parse(readFileSync(HOOK_JSON_PATH, "utf8"));
		const matcherGroups = manifest.settingsFragment?.hooks?.UserPromptSubmit;

		// Nested matcher-group schema: hooks.<Event> is an array of { hooks: [{type, command}] }, no matcher.
		expect(Array.isArray(matcherGroups)).toBe(true);
		expect(matcherGroups).toHaveLength(1);
		expect(matcherGroups[0].matcher).toBeUndefined();

		const commandEntries = matcherGroups[0].hooks;
		expect(commandEntries).toHaveLength(1);
		expect(commandEntries[0].type).toBe("command");
		// Exact contract: the command Claude Code executes, verbatim — not a loose pattern.
		expect(commandEntries[0].command).toBe('node "$CLAUDE_PROJECT_DIR"/.claude/hooks/kanban-track/kanban-track.mjs');

		// The referenced script basename must be a real shipped file.
		const scriptBasename = commandEntries[0].command.split("/").pop();
		expect(existsSync(join(ARTIFACT_DIR, scriptBasename))).toBe(true);

		// README documents the pointer state-dir convention.
		expect(readFileSync(README_PATH, "utf8")).toContain("kanban-session-state");
	});
});
