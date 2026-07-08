import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCache, setCachedRules } from "../../src/cli/lib/api-client";
import { installHooks } from "../../src/cli/lib/hooks-install";
import type { Config } from "../../src/cli/lib/types";

describe("installHooks", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(process.cwd(), "test-projects", "install-hooks-test");
		await mkdir(testDir, { recursive: true });
		resetCache();
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
		resetCache();
	});

	/** Seeds the api-client cache with a single `kanban-track` hook whose fragment registers `command`. */
	function seedCatalog(command: string): void {
		setCachedRules({
			agents: {
				"claude-code": {
					categories: {},
					hooks: [
						{
							name: "kanban-track",
							content: JSON.stringify({
								description: "test hook",
								event: "UserPromptSubmit",
								script: "kanban-track.mjs",
								settingsFragment: { hooks: { UserPromptSubmit: [{ hooks: [{ type: "command", command }] }] } },
							}),
							supportingFiles: [{ path: "kanban-track.mjs", content: "console.log('hook')" }],
						},
					],
				},
			},
		});
	}

	it("writes the script, registers the settings fragment, and records the hook in config", async () => {
		// Arrange: seed the cache with a fetched hook catalog entry (mirrors what fetchHooks returns)
		seedCatalog('node ".claude/hooks/kanban-track/kanban-track.mjs"');

		const config: Config = { version: "1.0.0", agent: "claude-code", categories: [] };

		// Act
		const result = await installHooks(["kanban-track"], "claude-code", undefined, config, testDir);

		// Assert: script written under .claude/hooks/<name>/
		const script = await readFile(join(testDir, ".claude", "hooks", "kanban-track", "kanban-track.mjs"), "utf-8");
		expect(script).toBe("console.log('hook')");

		// Assert: settings.json registered
		const settings = JSON.parse(await readFile(join(testDir, ".claude", "settings.json"), "utf-8"));
		expect(settings.hooks.UserPromptSubmit).toHaveLength(1);

		// Assert: config records the hook
		expect(result.config.hooks).toContain("kanban-track");
	});

	it("re-installing the same hook does not duplicate its settings entry", async () => {
		const command = 'node ".claude/hooks/kanban-track/kanban-track.mjs"';
		seedCatalog(command);
		const config: Config = { version: "1.0.0", agent: "claude-code", categories: [] };

		await installHooks(["kanban-track"], "claude-code", undefined, config, testDir);
		await installHooks(["kanban-track"], "claude-code", undefined, config, testDir);

		const settings = JSON.parse(await readFile(join(testDir, ".claude", "settings.json"), "utf-8"));
		expect(settings.hooks.UserPromptSubmit).toHaveLength(1);
	});

	it("re-installing a hook whose command changed removes the stale entry", async () => {
		const oldCommand = 'node ".claude/hooks/kanban-track/old.mjs"';
		const newCommand = 'node ".claude/hooks/kanban-track/new.mjs"';
		const config: Config = { version: "1.0.0", agent: "claude-code", categories: [] };

		seedCatalog(oldCommand);
		await installHooks(["kanban-track"], "claude-code", undefined, config, testDir);

		resetCache();
		seedCatalog(newCommand);
		await installHooks(["kanban-track"], "claude-code", undefined, config, testDir);

		const settings = JSON.parse(await readFile(join(testDir, ".claude", "settings.json"), "utf-8"));
		const commands = settings.hooks.UserPromptSubmit.flatMap((group: { hooks: Array<{ command: string }> }) =>
			group.hooks.map((h) => h.command),
		);
		expect(commands).toEqual([newCommand]);
	});
});
