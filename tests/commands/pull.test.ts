import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pullCommand } from "../../src/cli/commands/pull";
import { resetCache, setCachedRules } from "../../src/cli/lib/api-client";

describe("Pull Command Integration", () => {
	let testDir: string;
	let originalCwd: () => string;

	beforeEach(async () => {
		// Create a temp directory for each test
		testDir = join(tmpdir(), `pull-test-${Date.now()}`);
		await mkdir(testDir, { recursive: true });

		// Mock process.cwd() to point to our temp dir
		originalCwd = process.cwd;
		process.cwd = () => testDir;

		// Reset cache before each test
		resetCache();
	});

	afterEach(async () => {
		// Restore process.cwd
		process.cwd = originalCwd;

		// Cleanup temp dir
		await rm(testDir, { recursive: true, force: true });

		// Reset cache
		resetCache();

		vi.restoreAllMocks();
	});

	it("should print nothing-to-pull when config has no categories, skills, or workflows", async () => {
		// Arrange: write a config with empty arrays
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: [],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		// Capture console output
		const consoleSpy = vi.spyOn(console, "log");

		// Act
		await pullCommand();

		// Assert
		const output = consoleSpy.mock.calls.map((call) => call.join(" ")).join("\n");
		expect(output).toContain("Nothing configured to pull");
	});

	it("should log error when config references a category not found in API", async () => {
		// Arrange
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: ["non-existent-category"],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		setCachedRules({
			agents: {
				antigravity: {
					categories: {},
				},
			},
		});

		const errorSpy = vi.spyOn(console, "error");

		// Act
		await pullCommand();

		// Assert
		const errorOutput = errorSpy.mock.calls.map((call) => call.join(" ")).join("\n");
		expect(errorOutput).toContain("non-existent-category");
	});

	it("should log error when config references a skill not found in API", async () => {
		// Arrange
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: [],
			skills: ["non-existent-skill"],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		setCachedRules({
			agents: {
				antigravity: {
					categories: {},
					skills: [],
				},
			},
		});

		const errorSpy = vi.spyOn(console, "error");

		// Act
		await pullCommand();

		// Assert
		const errorOutput = errorSpy.mock.calls.map((call) => call.join(" ")).join("\n");
		expect(errorOutput).toContain("non-existent-skill");
	});

	it("should log error when config references a workflow not found in API", async () => {
		// Arrange
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: [],
			workflows: ["non-existent-workflow"],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		setCachedRules({
			agents: {
				antigravity: {
					categories: {},
					workflows: [],
				},
			},
		});

		const errorSpy = vi.spyOn(console, "error");

		// Act
		await pullCommand();

		// Assert
		const errorOutput = errorSpy.mock.calls.map((call) => call.join(" ")).join("\n");
		expect(errorOutput).toContain("non-existent-workflow");
	});

	it("should log error when rule file content is missing from API response", async () => {
		// Arrange: manifest references a file but category has no matching file content
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: ["test-category"],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		setCachedRules({
			agents: {
				antigravity: {
					categories: {
						"test-category": {
							manifest: {
								id: "test-category",
								category: "test-category",
								tags: [],
								description: "Test",
								version: "1.0.0",
								lastUpdated: new Date().toISOString(),
								files: [{ path: "missing-file.mdc", description: "Missing", required: true }],
								dependencies: [],
								conflicts: [],
								whenToUse: "testing",
							},
							files: [], // file content missing
						},
					},
				},
			},
		});

		const errorSpy = vi.spyOn(console, "error");

		// Act
		await pullCommand();

		// Assert
		const errorOutput = errorSpy.mock.calls.map((call) => call.join(" ")).join("\n");
		expect(errorOutput).toContain("Failed to fetch");
	});

	it("should only pull categories when no skills or workflows configured", async () => {
		// Arrange
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: ["arch"],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		setCachedRules({
			agents: {
				antigravity: {
					categories: {
						arch: {
							manifest: {
								id: "arch",
								category: "arch",
								tags: [],
								description: "Architecture",
								version: "1.0.0",
								lastUpdated: new Date().toISOString(),
								files: [{ path: "patterns.mdc", description: "Patterns", required: true }],
								dependencies: [],
								conflicts: [],
								whenToUse: "always",
							},
							files: [{ filename: "patterns.mdc", content: "# Arch Patterns" }],
						},
					},
				},
			},
		});

		const logSpy = vi.spyOn(console, "log");

		// Act
		await pullCommand();

		// Assert
		const output = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
		expect(output).toContain("Successfully pulled 1 items");
		expect(output).not.toContain("skills");
		expect(output).not.toContain("workflows");
	});

	it("should only pull skills when no categories configured", async () => {
		// Arrange
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: [],
			skills: ["my-skill"],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		setCachedRules({
			agents: {
				antigravity: {
					categories: {},
					skills: [{ name: "my-skill", content: "# My Skill\n\nSkill content." }],
				},
			},
		});

		const logSpy = vi.spyOn(console, "log");

		// Act
		await pullCommand();

		// Assert
		const output = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
		expect(output).toContain("Successfully pulled 1 items");
		expect(output).not.toContain("rule categories");
	});

	it("should install a skill's supporting files next to its SKILL.md, including nested folders", async () => {
		// Arrange: the catalog skill ships a top-level and a nested supporting file
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: [],
			skills: ["my-skill"],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		setCachedRules({
			agents: {
				antigravity: {
					categories: {},
					skills: [
						{
							name: "my-skill",
							content: "# My Skill",
							supportingFiles: [
								{ path: "reference.md", content: "# Reference" },
								{ path: "steps/1-open.md", content: "# Step 1: Open" },
							],
						},
					],
				},
			},
		});

		// Act
		await pullCommand();

		// Assert: every supporting file lands beside SKILL.md with its catalog content intact
		const skillDir = join(testDir, ".agents/skills/my-skill");
		expect(await readFile(join(skillDir, "SKILL.md"), "utf-8")).toBe("# My Skill");
		expect(await readFile(join(skillDir, "reference.md"), "utf-8")).toBe("# Reference");
		expect(await readFile(join(skillDir, "steps/1-open.md"), "utf-8")).toBe("# Step 1: Open");
	});

	it("should install an executable supporting file so the developer can run it", async () => {
		// Arrange: the catalog ships a runnable script next to an ordinary reference file
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: [],
			skills: ["my-skill"],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		setCachedRules({
			agents: {
				antigravity: {
					categories: {},
					skills: [
						{
							name: "my-skill",
							content: "# My Skill",
							supportingFiles: [
								{ path: "scripts/run.sh", content: "#!/bin/sh\necho hello\n", executable: true },
								{ path: "reference.md", content: "# Reference" },
							],
						},
					],
				},
			},
		});

		// Act
		await pullCommand();

		// Assert: the script is runnable on disk, and an ordinary file is not made executable
		const skillDir = join(testDir, ".agents/skills/my-skill");
		const script = await stat(join(skillDir, "scripts/run.sh"));
		const reference = await stat(join(skillDir, "reference.md"));
		expect(script.mode & 0o111).not.toBe(0);
		expect(reference.mode & 0o111).toBe(0);
	});

	it("should refuse a supporting file whose path escapes the project directory", async () => {
		// Arrange: a catalog path that climbs out of .agents/skills/my-skill/ and past the project root
		const config = {
			version: "1.0.0",
			agent: "antigravity",
			categories: [],
			skills: ["my-skill"],
		};
		await writeFile(join(testDir, ".ai-rules.json"), JSON.stringify(config, null, 2));

		setCachedRules({
			agents: {
				antigravity: {
					categories: {},
					skills: [
						{
							name: "my-skill",
							content: "# My Skill",
							supportingFiles: [{ path: "../../../../escaped.md", content: "must never be written" }],
						},
					],
				},
			},
		});
		const escapedPath = join(testDir, "..", "escaped.md");

		try {
			// Act + Assert: the pull is refused and nothing lands outside the project
			await expect(pullCommand()).rejects.toThrow("Refusing to write outside the project directory");
			expect(existsSync(escapedPath)).toBe(false);
		} finally {
			// A failing run would have written into the OS tmp dir — never leave that behind
			await rm(escapedPath, { force: true });
		}
	});
});
