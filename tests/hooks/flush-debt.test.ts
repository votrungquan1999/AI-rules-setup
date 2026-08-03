import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Black-box tests for the SHIPPED hook artifact: spawn the real .mjs and assert its stdin ->
// stdout behavior, same pattern as tests/hooks/spec-reminder.test.ts.
const ARTIFACT_DIR = join(__dirname, "../../hooks/claude-code/flush-debt");
const HOOK_PATH = join(ARTIFACT_DIR, "flush-debt.mjs");
const HOOK_JSON_PATH = join(ARTIFACT_DIR, "hook.json");

const MIRRORED_AT = "2026-08-02T10:00:00.000Z";
/** Seconds-since-epoch either side of MIRRORED_AT, for utimesSync. */
const BEFORE_MIRROR = new Date("2026-08-02T09:00:00.000Z").getTime() / 1000;
const AFTER_MIRROR = new Date("2026-08-02T11:00:00.000Z").getTime() / 1000;

interface HookResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

/** Spawns the hook with a stdin payload + env overrides; resolves once it exits. */
function runHook(input: Record<string, unknown>, env: Record<string, string>): Promise<HookResult> {
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

		child.stdin.write(JSON.stringify(input));
		child.stdin.end();
	});
}

/** Writes the session pointer under `<home>/.claude/kanban-session-state/<sessionId>.json`. */
function writePointerFixture(home: string, sessionId: string, pointer: Record<string, unknown>): void {
	const dir = join(home, ".claude", "kanban-session-state");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `${sessionId}.json`), JSON.stringify(pointer));
}

/** Writes a workspace file and forces its mtime, so debt is decided by timestamps not test speed. */
function writeWorkspaceFile(workspace: string, name: string, mtimeSeconds: number): void {
	const path = join(workspace, name);
	writeFileSync(path, `# ${name}\n`);
	utimesSync(path, mtimeSeconds, mtimeSeconds);
}

describe("flush-debt hook (shipped artifact)", () => {
	let home: string;
	let workspace: string;

	afterEach(() => {
		if (home) rmSync(home, { recursive: true, force: true });
		if (workspace) rmSync(workspace, { recursive: true, force: true });
	});

	function makeHome(): string {
		home = mkdtempSync(join(tmpdir(), "flush-debt-home-"));
		return home;
	}

	function makeWorkspace(): string {
		workspace = mkdtempSync(join(tmpdir(), "flush-debt-ws-"));
		return workspace;
	}

	it("a workspace file newer than the last mirror -> nudges, naming that file", async () => {
		makeHome();
		makeWorkspace();
		writeWorkspaceFile(workspace, "DECISIONS.md", AFTER_MIRROR);
		writePointerFixture(home, "sess-debt", {
			cardId: "a".repeat(24),
			cardNumber: 7,
			summary: "some work",
			workspacePath: workspace,
			lastMirroredAt: MIRRORED_AT,
		});

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-debt", hook_event_name: "Stop" },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		// Asserted before parsing so "stayed silent" fails as a behavior assertion, not a JSON error.
		expect(stdout).not.toBe("");
		const output = JSON.parse(stdout);
		expect(output.hookSpecificOutput.hookEventName).toBe("Stop");
		expect(output.hookSpecificOutput.additionalContext).toContain("DECISIONS.md");
	});

	// The debt must be CLEARABLE. spec-reminder looped forever because its condition could never
	// be satisfied; mirroring re-stamps lastMirroredAt, which must genuinely silence this hook.
	it("every workspace file older than the last mirror -> stays silent (debt is clearable)", async () => {
		makeHome();
		makeWorkspace();
		writeWorkspaceFile(workspace, "DECISIONS.md", BEFORE_MIRROR);
		writeWorkspaceFile(workspace, "IMPLEMENTATION_PROGRESS.md", BEFORE_MIRROR);
		writePointerFixture(home, "sess-clean", {
			cardId: "a".repeat(24),
			cardNumber: 7,
			summary: "some work",
			workspacePath: workspace,
			lastMirroredAt: MIRRORED_AT,
		});

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-clean", hook_event_name: "Stop" },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		expect(stdout).toBe("");
	});

	// Built in from the start rather than retrofitted: spec-reminder shipped without this and
	// produced eight consecutive self-triggered nudges in a live session.
	it("stop_hook_active -> stays silent even with real debt, so the nudge cannot re-trigger itself", async () => {
		makeHome();
		makeWorkspace();
		writeWorkspaceFile(workspace, "DECISIONS.md", AFTER_MIRROR);
		writePointerFixture(home, "sess-reentrant", {
			cardId: "a".repeat(24),
			cardNumber: 7,
			summary: "some work",
			workspacePath: workspace,
			lastMirroredAt: MIRRORED_AT,
		});

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-reentrant", hook_event_name: "Stop", stop_hook_active: true },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		expect(stdout).toBe("");
	});

	// Today's real-world state: every existing pointer predates these two fields. Without a
	// baseline the hook cannot tell debt from already-mirrored, so it reports nothing rather
	// than guessing — the same never-guess rule as --promotion-check (D17).
	it("pointer without workspacePath/lastMirroredAt -> stays silent rather than guessing", async () => {
		makeHome();
		makeWorkspace();
		writeWorkspaceFile(workspace, "DECISIONS.md", AFTER_MIRROR);
		writePointerFixture(home, "sess-legacy", {
			cardId: "a".repeat(24),
			cardNumber: 7,
			summary: "a pointer written before flush-debt existed",
		});

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-legacy", hook_event_name: "Stop" },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		expect(stdout).toBe("");
	});

	it("hook.json's settingsFragment matches Claude Code's nested Stop schema and targets the shipped script", () => {
		const manifest = JSON.parse(readFileSync(HOOK_JSON_PATH, "utf8"));

		expect(manifest.event).toBe("Stop");
		const matcherGroups = manifest.settingsFragment?.hooks?.Stop;

		// Nested matcher-group schema: hooks.<Event> is an array of { hooks: [{type, command}] }, no matcher.
		expect(Array.isArray(matcherGroups)).toBe(true);
		expect(matcherGroups).toHaveLength(1);
		expect(matcherGroups[0].matcher).toBeUndefined();

		const commandEntries = matcherGroups[0].hooks;
		expect(commandEntries).toHaveLength(1);
		expect(commandEntries[0].type).toBe("command");
		// Exact contract: the command Claude Code executes, verbatim — not a loose pattern.
		expect(commandEntries[0].command).toBe('node "$CLAUDE_PROJECT_DIR"/.claude/hooks/flush-debt/flush-debt.mjs');

		// The referenced script basename must be a real shipped file.
		const scriptBasename = commandEntries[0].command.split("/").pop();
		expect(existsSync(join(ARTIFACT_DIR, scriptBasename))).toBe(true);
	});
});
