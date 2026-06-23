import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	resetSecretWarned,
	runBulkSync,
	syncCommand,
	syncOneProject,
	warnIfSecretMissing,
} from "../../src/cli/commands/sync";
import * as apiClient from "../../src/cli/lib/api-client";
import { resetCache, setCachedRules } from "../../src/cli/lib/api-client";

/**
 * Seeds the api-client cache with a claude-code agent payload that has one rule category
 * (one file), one skill, and one workflow — the "full catalog" used across sync tests.
 */
function seedFullCatalog(scope?: string[]): void {
	setCachedRules(
		{
			agents: {
				"claude-code": {
					categories: {
						"typescript-conventions": {
							manifest: {
								id: "typescript-conventions",
								category: "typescript-conventions",
								tags: [],
								description: "TS",
								version: "1.0.0",
								lastUpdated: new Date().toISOString(),
								files: [{ path: "typescript-conventions.md", description: "TS", required: true }],
								dependencies: [],
								conflicts: [],
								whenToUse: "always",
							},
							files: [{ filename: "typescript-conventions.md", content: "# TS Conventions" }],
						},
					},
					skills: [{ name: "tdd-design", content: "# TDD Skill" }],
					workflows: [{ name: "commit-plan", content: "# Commit Plan Workflow" }],
				},
			},
		},
		scope,
	);
}

describe("Sync Command Integration", () => {
	let testDir: string;

	beforeEach(async () => {
		// mkdtemp guarantees a unique dir so concurrent test files never share filesystem state.
		testDir = await mkdtemp(join(tmpdir(), "sync-test-"));
		// Reset process-level state up front too, so a prior test that threw can't leak into this one.
		resetCache();
		resetSecretWarned();
		// Default: KB fetch returns nothing so tests never hit the network. Specific tests override.
		vi.spyOn(apiClient, "fetchKbMemories").mockResolvedValue([]);
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
		resetCache();
		resetSecretWarned();
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it("installs the entire available catalog (categories, skills, workflows) regardless of what the config currently lists", async () => {
		// Given: a claude-code project whose config lists nothing, and an API offering a full catalog
		const config = { version: "1.0.0", agent: "claude-code", categories: [] };
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));
		seedFullCatalog();

		// When
		await syncOneProject(testDir);

		// Then: a file from every catalog kind is materialized on disk
		const rule = await readFile(join(testDir, ".claude/rules/typescript-conventions.md"), "utf-8");
		const skill = await readFile(join(testDir, ".claude/skills/tdd-design/SKILL.md"), "utf-8");
		const workflow = await readFile(join(testDir, ".agents/workflows/commit-plan.md"), "utf-8");

		expect(rule).toBe("# TS Conventions");
		expect(skill).toBe("# TDD Skill");
		expect(workflow).toBe("# Commit Plan Workflow");
	});

	it("does not record a category as installed when none of its files could be fetched", async () => {
		// Given: a claude-code project and a catalog whose only category lists a file that has no
		// matching content (manifest path with no entry in files → fetchRuleFile returns null)
		const config = { version: "1.0.0", agent: "claude-code", categories: [] };
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));
		setCachedRules({
			agents: {
				"claude-code": {
					categories: {
						"ghost-category": {
							manifest: {
								id: "ghost-category",
								category: "ghost-category",
								tags: [],
								description: "X",
								version: "1.0.0",
								lastUpdated: new Date().toISOString(),
								files: [{ path: "missing.md", description: "X", required: true }],
								dependencies: [],
								conflicts: [],
								whenToUse: "always",
							},
							// No file whose filename matches "missing.md" → fetch returns null.
							files: [{ filename: "present-but-unlisted.md", content: "# Unlisted" }],
						},
					},
				},
			},
		});

		// When
		await syncOneProject(testDir);

		// Then: the config must not claim the category is installed, since no file landed on disk
		const written = JSON.parse(await readFile(join(testDir, ".ai-rules.json"), "utf-8"));
		expect(written.categories).toEqual([]);
	});

	it("overwrites an existing rule file with the latest catalog content, leaving nothing stale", async () => {
		// Given: a project that already has a stale version of a managed rule file
		const config = { version: "1.0.0", agent: "claude-code", categories: ["typescript-conventions"] };
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));
		await mkdir(join(testDir, ".claude/rules"), { recursive: true });
		await writeFile(join(testDir, ".claude/rules/typescript-conventions.md"), "# STALE CONTENT");
		seedFullCatalog();

		// When
		await syncOneProject(testDir);

		// Then: the stale content is replaced by the catalog's current content
		const rule = await readFile(join(testDir, ".claude/rules/typescript-conventions.md"), "utf-8");
		expect(rule).toBe("# TS Conventions");
	});

	it("rewrites the config to exactly the installed set while preserving version, agent, and scope", async () => {
		// Given: a scoped claude-code project whose config lists nothing yet
		const config = { version: "1.0.0", agent: "claude-code", categories: [], scope: ["work"] };
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));
		seedFullCatalog(["work"]);

		// When
		await syncOneProject(testDir);

		// Then: config now records exactly what was installed, with version/agent/scope untouched
		const written = JSON.parse(await readFile(join(testDir, ".ai-rules.json"), "utf-8"));
		expect(written).toEqual({
			version: "1.0.0",
			agent: "claude-code",
			scope: ["work"],
			categories: ["typescript-conventions"],
			skills: ["tdd-design"],
			workflows: ["commit-plan"],
		});
	});

	it("refuses to write a skill whose catalog name escapes the project directory", async () => {
		// Given: a claude-code project and a catalog skill whose name contains a path-traversal segment
		const config = { version: "1.0.0", agent: "claude-code", categories: [] };
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));
		setCachedRules({
			agents: {
				"claude-code": {
					categories: {},
					skills: [{ name: "../../../../tmp/evil", content: "# pwned" }],
				},
			},
		});

		// When / Then: the sync aborts rather than writing outside targetDir
		await expect(syncOneProject(testDir)).rejects.toThrow(/outside the project directory/);
		// And: nothing was written to the escape target
		await expect(readFile(join(tmpdir(), "evil/SKILL.md"), "utf-8")).rejects.toMatchObject({ code: "ENOENT" });
	});

	it("installs a skill's supporting files alongside the skill", async () => {
		// Given: a claude-code project and a catalog skill that ships a supporting file in a subdir
		const config = { version: "1.0.0", agent: "claude-code", categories: [] };
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));
		setCachedRules({
			agents: {
				"claude-code": {
					categories: {},
					skills: [
						{
							name: "tdd-design",
							content: "# TDD Skill",
							supportingFiles: [{ path: "nodes/node-research.md", content: "# Research Node" }],
						},
					],
				},
			},
		});

		// When
		await syncOneProject(testDir);

		// Then: both the skill file and its supporting file land at the expected paths
		const skill = await readFile(join(testDir, ".claude/skills/tdd-design/SKILL.md"), "utf-8");
		const supporting = await readFile(join(testDir, ".claude/skills/tdd-design/nodes/node-research.md"), "utf-8");
		expect(skill).toBe("# TDD Skill");
		expect(supporting).toBe("# Research Node");
	});

	it("installs rules and workflows but no skills for an agent that has no skill convention, omitting skills from the config", async () => {
		// Given: a windsurf project (no skill convention) and a catalog that nonetheless lists a skill
		const config = { version: "1.0.0", agent: "windsurf", categories: [] };
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));
		setCachedRules({
			agents: {
				windsurf: {
					categories: {
						"typescript-conventions": {
							manifest: {
								id: "typescript-conventions",
								category: "typescript-conventions",
								tags: [],
								description: "TS",
								version: "1.0.0",
								lastUpdated: new Date().toISOString(),
								files: [{ path: "typescript-conventions.md", description: "TS", required: true }],
								dependencies: [],
								conflicts: [],
								whenToUse: "always",
							},
							files: [{ filename: "typescript-conventions.md", content: "# TS Conventions" }],
						},
					},
					skills: [{ name: "tdd-design", content: "# TDD Skill" }],
					workflows: [{ name: "commit-plan", content: "# Commit Plan Workflow" }],
				},
			},
		});

		// When
		await syncOneProject(testDir);

		// Then: rule + workflow are installed, no skill is written, and config omits the skills key
		const rule = await readFile(join(testDir, ".windsurf/rules/typescript-conventions.md"), "utf-8");
		expect(rule).toBe("# TS Conventions");
		const workflow = await readFile(join(testDir, ".agents/workflows/commit-plan.md"), "utf-8");
		expect(workflow).toBe("# Commit Plan Workflow");

		const written = JSON.parse(await readFile(join(testDir, ".ai-rules.json"), "utf-8"));
		expect(written).toEqual({
			version: "1.0.0",
			agent: "windsurf",
			categories: ["typescript-conventions"],
			workflows: ["commit-plan"],
		});
		expect(written).not.toHaveProperty("skills");
	});

	it("materializes knowledge-base memories for a scoped claude-code project", async () => {
		// Given: a scoped claude-code project and a KB that returns two memories
		const config = { version: "1.0.0", agent: "claude-code", categories: [], scope: ["work"] };
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));
		seedFullCatalog(["work"]);
		vi.spyOn(apiClient, "fetchKbMemories").mockResolvedValue([
			{ id: "m1", title: "Build before pushing", body: "Run the full build." },
			{ id: "m2", title: "No co-author", body: "Omit co-author lines." },
		]);

		// When
		await syncOneProject(testDir);

		// Then: the managed memory file is written with both memories, keyed by the project scope
		expect(apiClient.fetchKbMemories).toHaveBeenCalledWith(["work"]);
		const memoryFile = await readFile(join(testDir, ".claude/rules/kb-memory.md"), "utf-8");
		expect(memoryFile).toContain("## Build before pushing");
		expect(memoryFile).toContain("Run the full build.");
		expect(memoryFile).toContain("## No co-author");
		expect(memoryFile).toContain("Omit co-author lines.");
	});

	it("isolates a KB fetch failure: the rest of the sync completes and a warning is logged", async () => {
		// Given: a scoped claude-code project where the KB fetch rejects
		const config = { version: "1.0.0", agent: "claude-code", categories: [], scope: ["work"] };
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));
		seedFullCatalog(["work"]);
		vi.spyOn(apiClient, "fetchKbMemories").mockRejectedValue(new Error("network down"));
		const warnSpy = vi.spyOn(console, "warn");

		// When
		await syncOneProject(testDir);

		// Then: the rule from the catalog is still installed, no memory file is written, and a warning fired
		const rule = await readFile(join(testDir, ".claude/rules/typescript-conventions.md"), "utf-8");
		expect(rule).toBe("# TS Conventions");
		await expect(readFile(join(testDir, ".claude/rules/kb-memory.md"), "utf-8")).rejects.toMatchObject({
			code: "ENOENT",
		});
		expect(warnSpy.mock.calls.map((call) => call.join(" ")).join("\n")).toContain("network down");
	});

	it("keeps syncing the remaining projects when one project throws mid-run", async () => {
		// Given: a root with a broken project (unknown agent that has catalog entries → throws on
		// naming) discovered BEFORE a valid claude-code project
		const brokenDir = join(testDir, "a-broken");
		const validDir = join(testDir, "b-valid");
		await mkdir(brokenDir, { recursive: true });
		await mkdir(validDir, { recursive: true });
		await writeFile(
			join(brokenDir, ".ai-rules.json"),
			JSON.stringify({ version: "1.0.0", agent: "broken-agent", categories: [] }),
		);
		await writeFile(
			join(validDir, ".ai-rules.json"),
			JSON.stringify({ version: "1.0.0", agent: "claude-code", categories: [] }),
		);
		setCachedRules({
			agents: {
				"claude-code": {
					categories: {
						"typescript-conventions": {
							manifest: {
								id: "typescript-conventions",
								category: "typescript-conventions",
								tags: [],
								description: "TS",
								version: "1.0.0",
								lastUpdated: new Date().toISOString(),
								files: [{ path: "typescript-conventions.md", description: "TS", required: true }],
								dependencies: [],
								conflicts: [],
								whenToUse: "always",
							},
							files: [{ filename: "typescript-conventions.md", content: "# TS Conventions" }],
						},
					},
				},
				"broken-agent": {
					categories: {
						"some-category": {
							manifest: {
								id: "some-category",
								category: "some-category",
								tags: [],
								description: "X",
								version: "1.0.0",
								lastUpdated: new Date().toISOString(),
								files: [{ path: "x.md", description: "X", required: true }],
								dependencies: [],
								conflicts: [],
								whenToUse: "always",
							},
							files: [{ filename: "x.md", content: "# X" }],
						},
					},
				},
			},
		});

		// When: the broken project throws, but the run continues
		await runBulkSync(testDir);

		// Then: the valid project was still synced
		const rule = await readFile(join(validDir, ".claude/rules/typescript-conventions.md"), "utf-8");
		expect(rule).toBe("# TS Conventions");
	});

	it("returns and prints a summary of succeeded and failed projects", async () => {
		// Given: a root with one valid and one broken project (same fixture as the isolation test)
		const brokenDir = join(testDir, "a-broken");
		const validDir = join(testDir, "b-valid");
		await mkdir(brokenDir, { recursive: true });
		await mkdir(validDir, { recursive: true });
		await writeFile(
			join(brokenDir, ".ai-rules.json"),
			JSON.stringify({ version: "1.0.0", agent: "broken-agent", categories: [] }),
		);
		await writeFile(
			join(validDir, ".ai-rules.json"),
			JSON.stringify({ version: "1.0.0", agent: "claude-code", categories: [] }),
		);
		setCachedRules({
			agents: {
				"claude-code": { categories: {} },
				"broken-agent": {
					categories: {
						"some-category": {
							manifest: {
								id: "some-category",
								category: "some-category",
								tags: [],
								description: "X",
								version: "1.0.0",
								lastUpdated: new Date().toISOString(),
								files: [{ path: "x.md", description: "X", required: true }],
								dependencies: [],
								conflicts: [],
								whenToUse: "always",
							},
							files: [{ filename: "x.md", content: "# X" }],
						},
					},
				},
			},
		});
		const logSpy = vi.spyOn(console, "log");

		// When
		const summary = await runBulkSync(testDir);

		// Then: the returned counts are correct and a summary line is printed
		expect(summary).toEqual({ succeeded: 1, failed: 1 });
		const output = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
		expect(output).toContain("1 succeeded");
		expect(output).toContain("1 failed");
	});

	it("warns exactly once that private content is skipped when AI_RULES_SECRET is unset", async () => {
		// Given: no secret in the environment (vi.unstubAllEnvs in afterEach restores it)
		vi.stubEnv("AI_RULES_SECRET", "");
		const warnSpy = vi.spyOn(console, "warn");

		// When: the warning is triggered more than once (as it would be per-project in --all)
		warnIfSecretMissing();
		warnIfSecretMissing();

		// Then: it fires exactly once and names the secret + the skipped private content
		expect(warnSpy).toHaveBeenCalledTimes(1);
		const message = warnSpy.mock.calls[0]?.join(" ") ?? "";
		expect(message).toContain("AI_RULES_SECRET");
		expect(message.toLowerCase()).toContain("private");
	});

	it("runs a bulk sync over the given root and warns about the missing secret when invoked with --all", async () => {
		// Given: a root with one valid project, and no secret in the environment
		vi.stubEnv("AI_RULES_SECRET", "");
		const validDir = join(testDir, "repo");
		await mkdir(validDir, { recursive: true });
		await writeFile(
			join(validDir, ".ai-rules.json"),
			JSON.stringify({ version: "1.0.0", agent: "claude-code", categories: [] }),
		);
		setCachedRules({ agents: { "claude-code": { categories: {} } } });
		const warnSpy = vi.spyOn(console, "warn");

		// When
		const summary = await syncCommand({ all: true, root: testDir });

		// Then: the command ran the bulk sync over the root and surfaced the secret warning
		expect(summary).toEqual({ succeeded: 1, failed: 0 });
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy.mock.calls[0]?.join(" ") ?? "").toContain("AI_RULES_SECRET");
	});
});
