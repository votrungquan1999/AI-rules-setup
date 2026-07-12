import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Black-box tests for the SHIPPED hook artifact: spawn the real .mjs and assert its stdin ->
// stdout behavior, same pattern as tests/hooks/kanban-track.test.ts. The hook is a
// zero-dependency standalone script, so we exercise it as Claude Code would (a JSON payload on
// stdin, additionalContext on stdout when nudging) rather than importing it.
const ARTIFACT_DIR = join(__dirname, "../../hooks/claude-code/spec-reminder");
const HOOK_PATH = join(ARTIFACT_DIR, "spec-reminder.mjs");
const HOOK_JSON_PATH = join(ARTIFACT_DIR, "hook.json");

/** The exact nudge text the hook emits, mirroring buildNudge(). Asserted exactly so any
 * wording change is a deliberate, visible test update rather than a silent pass. */
function specNudge(specPath: string): string {
	return (
		`Code changed this session but ${specPath} wasn't touched. ` +
		"If this work changed feature behavior, update the living spec before wrapping up."
	);
}

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

/** Writes the session sentinel under `<home>/.claude/spec-reminder-state/<sessionId>.json`. */
function writeSentinelFixture(home: string, sessionId: string, sentinel: Record<string, unknown>): void {
	const dir = join(home, ".claude", "spec-reminder-state");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `${sessionId}.json`), JSON.stringify(sentinel));
}

/** Creates a real throwaway git repo (so `git status --porcelain` behaves exactly like it would
 * in a real session) and returns its path. */
function makeGitRepo(): string {
	const dir = mkdtempSync(join(tmpdir(), "spec-reminder-repo-"));
	execSync("git init", { cwd: dir, stdio: "ignore" });
	return dir;
}

describe("spec-reminder hook (shipped artifact)", () => {
	let home: string;
	let repo: string;

	afterEach(() => {
		if (home) rmSync(home, { recursive: true, force: true });
		if (repo) rmSync(repo, { recursive: true, force: true });
	});

	function makeHome(): string {
		home = mkdtempSync(join(tmpdir(), "spec-reminder-home-"));
		return home;
	}

	it("no sentinel for the session -> stays silent, exits 0", async () => {
		makeHome();
		repo = makeGitRepo();

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-no-sentinel", hook_event_name: "Stop", cwd: repo },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		expect(stdout).toBe("");
	});

	it("malformed sentinel JSON -> degrades to silent, exits 0 (never crashes)", async () => {
		makeHome();
		repo = makeGitRepo();
		const stateDir = join(home, ".claude", "spec-reminder-state");
		mkdirSync(stateDir, { recursive: true });
		writeFileSync(join(stateDir, "sess-corrupt.json"), "{ not valid json");

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-corrupt", hook_event_name: "Stop", cwd: repo },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		expect(stdout).toBe("");
	});

	it("sentinel present, git tree clean -> no nudge", async () => {
		makeHome();
		repo = makeGitRepo();
		writeSentinelFixture(home, "sess-clean", {
			slug: "my-feature",
			specPath: "docs/features/my-feature/spec.md",
		});

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-clean", hook_event_name: "Stop", cwd: repo },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		expect(stdout).toBe("");
	});

	it("sentinel present, git tree dirty, spec path IS among changed files -> no nudge", async () => {
		makeHome();
		repo = makeGitRepo();
		writeSentinelFixture(home, "sess-spec-touched", {
			slug: "my-feature",
			specPath: "docs/features/my-feature/spec.md",
		});
		mkdirSync(join(repo, "docs", "features", "my-feature"), { recursive: true });
		writeFileSync(join(repo, "docs", "features", "my-feature", "spec.md"), "# My Feature\n");

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-spec-touched", hook_event_name: "Stop", cwd: repo },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		expect(stdout).toBe("");
	});

	it("sentinel present, git tree dirty, spec path NOT among changed files -> nudge emitted", async () => {
		makeHome();
		repo = makeGitRepo();
		writeSentinelFixture(home, "sess-spec-untouched", {
			slug: "my-feature",
			specPath: "docs/features/my-feature/spec.md",
		});
		writeFileSync(join(repo, "src-change.js"), "console.log('changed');\n");

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-spec-untouched", hook_event_name: "Stop", cwd: repo },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		const output = JSON.parse(stdout);
		expect(output.hookSpecificOutput.hookEventName).toBe("Stop");
		expect(output.hookSpecificOutput.additionalContext).toBe(specNudge("docs/features/my-feature/spec.md"));
	});

	it("cwd is not a git repo -> exits 0, no throw, no nudge (defensive fallback)", async () => {
		makeHome();
		writeSentinelFixture(home, "sess-not-a-repo", {
			slug: "my-feature",
			specPath: "docs/features/my-feature/spec.md",
		});
		// A path that doesn't exist at all guarantees `git status` fails deterministically,
		// regardless of whether the OS temp dir happens to sit inside some ancestor git repo.
		const missingCwd = join(tmpdir(), `spec-reminder-missing-${Date.now()}`);

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-not-a-repo", hook_event_name: "Stop", cwd: missingCwd },
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
		expect(commandEntries[0].command).toBe('node "$CLAUDE_PROJECT_DIR"/.claude/hooks/spec-reminder/spec-reminder.mjs');

		// The referenced script basename must be a real shipped file.
		const scriptBasename = commandEntries[0].command.split("/").pop();
		expect(existsSync(join(ARTIFACT_DIR, scriptBasename))).toBe(true);
	});
});
