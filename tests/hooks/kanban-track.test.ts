import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Black-box tests for the SHIPPED hook artifact: spawn the real .mjs and assert its stdin -> stdout /
// HTTP behavior. The hook is a zero-dependency standalone script, so we exercise it as Claude Code
// would (a JSON payload on stdin, additionalContext on stdout, a best-effort POST) rather than importing it.
const ARTIFACT_DIR = join(__dirname, "../../hooks/claude-code/kanban-track");
const HOOK_PATH = join(ARTIFACT_DIR, "kanban-track.mjs");
const HOOK_JSON_PATH = join(ARTIFACT_DIR, "hook.json");
const README_PATH = join(ARTIFACT_DIR, "README.md");

// Expected reminder text, mirroring the hook's buildReminder(). Asserted exactly (not by pattern)
// so any wording change is a deliberate, visible test update rather than a silent pass.
const NO_POINTER_REMINDER =
	"No AI-Kanban card is active for this session. If this prompt starts substantive, multi-step work, open a card to track it.";

/** The exact active-card reminder the hook emits for a given card. */
function activeCardReminder(cardNumber: number, summary: string): string {
	return (
		`Active AI-Kanban card #${cardNumber} (${summary}). ` +
		"If this prompt diverges into a new task, open a NEW card; otherwise append progress to this card."
	);
}

interface HookResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

interface CapturedRequest {
	method: string | undefined;
	headers: IncomingMessage["headers"];
	body: string;
}

/** Spawns the hook with a stdin payload + env overrides; resolves once it exits. Async (not sync) so a
 * stub HTTP server in this same test process can still respond mid-run. */
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

/** Config fixture for `~/.claude.json`; `projectEntry` + `cwd` also seed a project-scoped override. */
interface ClaudeConfigFixture {
	url: string;
	authorization: string;
	cwd?: string;
	projectEntry?: unknown;
}

/** Writes the session pointer under `<home>/.claude/kanban-session-state/<sessionId>.json`. */
function writePointerFixture(home: string, sessionId: string, pointer: Record<string, unknown>): void {
	const dir = join(home, ".claude", "kanban-session-state");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `${sessionId}.json`), JSON.stringify(pointer));
}

/** Writes a fixture `~/.claude.json` carrying the `ai-kanban-dispatch` mcpServers entry. */
function writeClaudeConfigFixture(home: string, { url, authorization, cwd, projectEntry }: ClaudeConfigFixture): void {
	const config = {
		mcpServers: { "ai-kanban-dispatch": { type: "http", url, headers: { Authorization: authorization } } },
		projects: cwd ? { [cwd]: { mcpServers: projectEntry ? { "ai-kanban-dispatch": projectEntry } : {} } } : {},
	};
	writeFileSync(join(home, ".claude.json"), JSON.stringify(config));
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

	it("no pointer for the session -> emits an open-a-card reminder", async () => {
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
		expect(output.hookSpecificOutput.additionalContext).toBe(NO_POINTER_REMINDER);
	});

	it("pointer present -> names the active card and gives diverge/append guidance", async () => {
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
		expect(context).toBe(activeCardReminder(42, "wire the hook"));
	});

	it("pointer present -> POSTs the prompt to the kanban as an append_progress note", async () => {
		makeHome();
		// Holder object (not a bare `let`) so the closure assignment isn't narrowed away by TS.
		const captured: { req: CapturedRequest | null } = { req: null };
		const server = createServer((request: IncomingMessage, res: ServerResponse) => {
			let body = "";
			request.on("data", (chunk) => {
				body += chunk;
			});
			request.on("end", () => {
				captured.req = { method: request.method, headers: request.headers, body };
				res.writeHead(200, { "Content-Type": "text/event-stream" });
				res.end('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n');
			});
		});

		try {
			await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
			const { port } = server.address() as { port: number };
			writePointerFixture(home, "sess-post", {
				cardNumber: 7,
				cardId: "0123456789abcdef01234567",
				summary: "post test",
			});
			writeClaudeConfigFixture(home, { url: `http://127.0.0.1:${port}/api/mcp`, authorization: "Basic dGVzdDp0ZXN0" });

			const { exitCode } = await runHook(
				{ session_id: "sess-post", prompt: "log me", hook_event_name: "UserPromptSubmit", cwd: "/tmp/project" },
				{ HOME: home },
			);

			expect(exitCode).toBe(0);
			const req = captured.req;
			expect(req).not.toBeNull();
			if (!req) throw new Error("expected the hook to POST to the stub kanban endpoint");
			expect(req.method).toBe("POST");
			expect(req.headers.authorization).toBe("Basic dGVzdDp0ZXN0");
			expect(req.headers["content-type"]).toBe("application/json");
			expect(req.headers.accept).toBe("application/json, text/event-stream");

			const payload = JSON.parse(req.body);
			expect(payload.jsonrpc).toBe("2.0");
			expect(payload.method).toBe("tools/call");
			expect(payload.params.name).toBe("append_progress");
			expect(payload.params.arguments.id).toBe("0123456789abcdef01234567");
			expect(payload.params.arguments.note).toBe("log me");
		} finally {
			await new Promise<void>((resolve) => server.close(() => resolve()));
		}
	});

	it("project-scoped kanban config entry takes precedence over the global fallback", async () => {
		makeHome();
		const cwd = "/tmp/my-project";
		let hitGlobal = false;
		let hitProject = false;
		const globalServer = createServer((_req, res) => {
			hitGlobal = true;
			res.writeHead(200);
			res.end();
		});
		const projectServer = createServer((_req, res) => {
			hitProject = true;
			res.writeHead(200);
			res.end();
		});

		try {
			await Promise.all([
				new Promise<void>((resolve) => globalServer.listen(0, "127.0.0.1", resolve)),
				new Promise<void>((resolve) => projectServer.listen(0, "127.0.0.1", resolve)),
			]);
			const globalUrl = `http://127.0.0.1:${(globalServer.address() as { port: number }).port}/api/mcp`;
			const projectUrl = `http://127.0.0.1:${(projectServer.address() as { port: number }).port}/api/mcp`;

			writePointerFixture(home, "sess-precedence", {
				cardNumber: 9,
				cardId: "0123456789abcdef01234567",
				summary: "precedence test",
			});
			writeClaudeConfigFixture(home, {
				url: globalUrl,
				authorization: "Basic Z2xvYmFs",
				cwd,
				projectEntry: { type: "http", url: projectUrl, headers: { Authorization: "Basic cHJvamVjdA==" } },
			});

			const { exitCode } = await runHook(
				{ session_id: "sess-precedence", prompt: "log me", hook_event_name: "UserPromptSubmit", cwd },
				{ HOME: home },
			);

			expect(exitCode).toBe(0);
			expect(hitProject).toBe(true);
			expect(hitGlobal).toBe(false);
		} finally {
			await Promise.all([
				new Promise<void>((resolve) => globalServer.close(() => resolve())),
				new Promise<void>((resolve) => projectServer.close(() => resolve())),
			]);
		}
	});

	it("kanban endpoint unreachable -> exits 0 without throwing, reminder still emitted", async () => {
		makeHome();
		writePointerFixture(home, "sess-unreachable", {
			cardNumber: 3,
			cardId: "0123456789abcdef01234567",
			summary: "unreachable test",
		});
		// Nothing listens on port 1 -> ECONNREFUSED.
		writeClaudeConfigFixture(home, { url: "http://127.0.0.1:1/api/mcp", authorization: "Basic dGVzdDp0ZXN0" });

		const { stdout, stderr, exitCode } = await runHook(
			{ session_id: "sess-unreachable", prompt: "log me", hook_event_name: "UserPromptSubmit", cwd: "/tmp/project" },
			{ HOME: home },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toBe("");
		expect(JSON.parse(stdout).hookSpecificOutput.additionalContext).toBe(activeCardReminder(3, "unreachable test"));
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
		expect(JSON.parse(stdout).hookSpecificOutput.additionalContext).toBe(NO_POINTER_REMINDER);
	});

	it("pointer present but prompt empty -> still emits the reminder and does NOT POST an empty note", async () => {
		makeHome();
		let serverHit = false;
		const server = createServer((_req, res) => {
			serverHit = true;
			res.writeHead(200);
			res.end();
		});

		try {
			await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
			const { port } = server.address() as { port: number };
			writePointerFixture(home, "sess-empty-prompt", {
				cardNumber: 5,
				cardId: "0123456789abcdef01234567",
				summary: "empty prompt test",
			});
			writeClaudeConfigFixture(home, { url: `http://127.0.0.1:${port}/api/mcp`, authorization: "Basic dGVzdDp0ZXN0" });

			const { stdout, exitCode } = await runHook(
				{ session_id: "sess-empty-prompt", prompt: "", hook_event_name: "UserPromptSubmit", cwd: "/tmp/project" },
				{ HOME: home },
			);

			expect(exitCode).toBe(0);
			expect(JSON.parse(stdout).hookSpecificOutput.additionalContext).toBe(activeCardReminder(5, "empty prompt test"));
			// append_progress requires a non-empty note; the hook must skip the POST, not send "".
			expect(serverHit).toBe(false);
		} finally {
			await new Promise<void>((resolve) => server.close(() => resolve()));
		}
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
