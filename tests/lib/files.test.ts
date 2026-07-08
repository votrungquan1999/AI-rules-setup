import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	applyHookNamingConvention,
	mergeSettingsJson,
	pruneManagedHook,
	readManagedHooks,
	recordManagedHook,
} from "../../src/cli/lib/files";
import { AIAgent } from "../../src/cli/lib/types";

describe("mergeSettingsJson", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(process.cwd(), "test-projects", "merge-settings-json-test");
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("preserves an existing hand-written hook while adding a new ai-rules hook", async () => {
		// Arrange: a settings.json that already has a developer's own hand-written hook
		const settingsPath = join(testDir, ".claude", "settings.json");
		await mkdir(join(testDir, ".claude"), { recursive: true });
		await writeFile(
			settingsPath,
			JSON.stringify({
				hooks: {
					UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo hand-written" }] }],
				},
			}),
			"utf-8",
		);

		// Act
		await mergeSettingsJson(testDir, {
			hooks: {
				UserPromptSubmit: [
					{ hooks: [{ type: "command", command: 'node ".claude/hooks/kanban-track/kanban-track.mjs"' }] },
				],
			},
		});

		// Assert: both entries survive under the same event key
		const written = JSON.parse(await readFile(settingsPath, "utf-8"));
		const groups = written.hooks.UserPromptSubmit;
		expect(groups).toHaveLength(2);
		const commands = groups.flatMap((g: { hooks: Array<{ command: string }> }) => g.hooks.map((h) => h.command));
		expect(commands).toContain("echo hand-written");
		expect(commands).toContain('node ".claude/hooks/kanban-track/kanban-track.mjs"');
	});

	it("creates .claude/settings.json when it does not exist yet", async () => {
		// Act: no .claude/settings.json exists in testDir at all
		await mergeSettingsJson(testDir, {
			hooks: { UserPromptSubmit: [{ hooks: [{ type: "command", command: "node hook.mjs" }] }] },
		});

		// Assert
		const settingsPath = join(testDir, ".claude", "settings.json");
		const written = JSON.parse(await readFile(settingsPath, "utf-8"));
		expect(written.hooks.UserPromptSubmit).toHaveLength(1);
	});

	it("fails closed (throws) instead of silently overwriting a malformed existing settings.json", async () => {
		// Arrange: settings.json exists but is not valid JSON
		await mkdir(join(testDir, ".claude"), { recursive: true });
		await writeFile(join(testDir, ".claude", "settings.json"), "{ this is not valid json", "utf-8");

		// Act + Assert
		await expect(
			mergeSettingsJson(testDir, { hooks: { UserPromptSubmit: [{ hooks: [{ type: "command", command: "x" }] }] } }),
		).rejects.toThrow();
	});
});

describe("applyHookNamingConvention", () => {
	it("returns .claude/hooks/<name>/<file> for claude-code", () => {
		const result = applyHookNamingConvention(AIAgent.CLAUDE_CODE, "kanban-track", "kanban-track.mjs");
		expect(result).toBe(".claude/hooks/kanban-track/kanban-track.mjs");
	});
});

describe("recordManagedHook", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(process.cwd(), "test-projects", "record-managed-hook-test");
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("records the managed hook entry in .claude/.ai-rules-managed.json", async () => {
		// Act
		await recordManagedHook(testDir, "kanban-track", {
			event: "UserPromptSubmit",
			command: 'node ".claude/hooks/kanban-track/kanban-track.mjs"',
			scriptPath: ".claude/hooks/kanban-track/kanban-track.mjs",
		});

		// Assert
		const sidecarPath = join(testDir, ".claude", ".ai-rules-managed.json");
		const written = JSON.parse(await readFile(sidecarPath, "utf-8"));
		expect(written.managedHooks["kanban-track"]).toEqual({
			event: "UserPromptSubmit",
			command: 'node ".claude/hooks/kanban-track/kanban-track.mjs"',
			scriptPath: ".claude/hooks/kanban-track/kanban-track.mjs",
		});
	});
});

describe("readManagedHooks", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(process.cwd(), "test-projects", "read-managed-hooks-test");
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("returns the entry a prior recordManagedHook call wrote", async () => {
		// Arrange
		await recordManagedHook(testDir, "kanban-track", {
			event: "UserPromptSubmit",
			command: 'node ".claude/hooks/kanban-track/kanban-track.mjs"',
			scriptPath: ".claude/hooks/kanban-track/kanban-track.mjs",
		});

		// Act
		const managed = await readManagedHooks(testDir);

		// Assert
		expect(managed["kanban-track"]).toEqual({
			event: "UserPromptSubmit",
			command: 'node ".claude/hooks/kanban-track/kanban-track.mjs"',
			scriptPath: ".claude/hooks/kanban-track/kanban-track.mjs",
		});
	});

	it("returns an empty map when no sidecar exists yet", async () => {
		// Act
		const managed = await readManagedHooks(testDir);

		// Assert
		expect(managed).toEqual({});
	});
});

describe("pruneManagedHook", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(process.cwd(), "test-projects", "prune-managed-hook-test");
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it("removes the managed settings entry and script directory while leaving a hand-written hook untouched", async () => {
		// Arrange: settings.json has both a hand-written hook and an ai-rules-managed one
		const settingsPath = join(testDir, ".claude", "settings.json");
		await mkdir(join(testDir, ".claude"), { recursive: true });
		await writeFile(
			settingsPath,
			JSON.stringify({
				hooks: {
					UserPromptSubmit: [
						{ hooks: [{ type: "command", command: "echo hand-written" }] },
						{ hooks: [{ type: "command", command: 'node ".claude/hooks/kanban-track/kanban-track.mjs"' }] },
					],
				},
			}),
			"utf-8",
		);
		// The managed hook's script file on disk
		const scriptPath = join(testDir, ".claude", "hooks", "kanban-track", "kanban-track.mjs");
		await mkdir(join(testDir, ".claude", "hooks", "kanban-track"), { recursive: true });
		await writeFile(scriptPath, "console.log('hook')", "utf-8");
		// The sidecar recording it as managed
		await recordManagedHook(testDir, "kanban-track", {
			event: "UserPromptSubmit",
			command: 'node ".claude/hooks/kanban-track/kanban-track.mjs"',
			scriptPath: ".claude/hooks/kanban-track/kanban-track.mjs",
		});

		// Act
		await pruneManagedHook(testDir, "kanban-track", {
			event: "UserPromptSubmit",
			command: 'node ".claude/hooks/kanban-track/kanban-track.mjs"',
			scriptPath: ".claude/hooks/kanban-track/kanban-track.mjs",
		});

		// Assert: settings.json keeps the hand-written entry, drops the managed one
		const settings = JSON.parse(await readFile(settingsPath, "utf-8"));
		const commands = settings.hooks.UserPromptSubmit.flatMap((g: { hooks: Array<{ command: string }> }) =>
			g.hooks.map((h) => h.command),
		);
		expect(commands).toEqual(["echo hand-written"]);

		// Assert: the script directory is gone
		await expect(readFile(scriptPath, "utf-8")).rejects.toThrow();

		// Assert: the sidecar no longer records it
		const managed = await readManagedHooks(testDir);
		expect(managed["kanban-track"]).toBeUndefined();
	});
});
