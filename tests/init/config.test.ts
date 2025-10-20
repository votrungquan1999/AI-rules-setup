import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCategory, loadConfig, saveConfig } from "../../src/cli/lib/config";
import type { Config } from "../../src/cli/lib/types";

describe("Config Manager", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(process.cwd(), "test-projects", "config-test");
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("loadConfig", () => {
		it("should return default config when no config file exists", async () => {
			const config = await loadConfig(testDir);

			expect(config.version).toBe("1.0.0");
			expect(config.agent).toBe("cursor");
			expect(config.categories).toEqual([]);

			// Also verify the file was written to disk with defaults
			const written = await readFile(join(testDir, ".ai-rules.json"), "utf-8");
			const parsed = JSON.parse(written);
			expect(parsed.version).toBe("1.0.0");
			expect(parsed.agent).toBe("cursor");
			expect(parsed.categories).toEqual([]);
		});

		it("should load existing config file", async () => {
			const existingConfig: Config = {
				version: "1.0.0",
				agent: "windsurf",
				categories: ["typescript", "react"],
			};

			const configPath = join(testDir, ".ai-rules.json");
			await writeFile(configPath, JSON.stringify(existingConfig, null, 2), "utf-8");

			const loadedConfig = await loadConfig(testDir);

			expect(loadedConfig.agent).toBe("windsurf");
			expect(loadedConfig.categories).toEqual(["typescript", "react"]);
		});

		it("should handle malformed JSON gracefully", async () => {
			const configPath = join(testDir, ".ai-rules.json");
			await writeFile(configPath, "invalid json content", "utf-8");

			const config = await loadConfig(testDir);

			// Should return default config when JSON is invalid
			expect(config.version).toBe("1.0.0");
			expect(config.agent).toBe("cursor");
			expect(config.categories).toEqual([]);

			// And it should have overwritten the malformed file with defaults
			const written = await readFile(join(testDir, ".ai-rules.json"), "utf-8");
			const parsed = JSON.parse(written);
			expect(parsed.version).toBe("1.0.0");
			expect(parsed.agent).toBe("cursor");
			expect(parsed.categories).toEqual([]);
		});
	});

	describe("saveConfig", () => {
		it("should save config to .ai-rules.json", async () => {
			const config: Config = {
				version: "1.0.0",
				agent: "cursor",
				categories: [],
			};

			await saveConfig(testDir, config);

			const configPath = join(testDir, ".ai-rules.json");
			const savedContent = await readFile(configPath, "utf-8");
			const savedConfig = JSON.parse(savedContent);

			expect(savedConfig.version).toBe("1.0.0");
			expect(savedConfig.agent).toBe("cursor");
		});

		it("should create directory structure if needed", async () => {
			const nestedDir = join(testDir, "nested", "project");
			const config: Config = {
				version: "1.0.0",
				agent: "cursor",
				categories: [],
			};

			await saveConfig(nestedDir, config);

			const configPath = join(nestedDir, ".ai-rules.json");
			const savedContent = await readFile(configPath, "utf-8");
			const savedConfig = JSON.parse(savedContent);

			expect(savedConfig.agent).toBe("cursor");
		});

		it("should format JSON with proper indentation", async () => {
			const config: Config = {
				version: "1.0.0",
				agent: "cursor",
				categories: ["test", "typescript"],
			};

			await saveConfig(testDir, config);

			const configPath = join(testDir, ".ai-rules.json");
			const savedContent = await readFile(configPath, "utf-8");

			// Should be formatted with 2-space indentation
			expect(savedContent).toContain('  "version": "1.0.0"');
			expect(savedContent).toContain('    "test"');
		});
	});

	describe("addCategory", () => {
		it("should add category to existing config", async () => {
			const config: Config = {
				version: "1.0.0",
				agent: "cursor",
				categories: [],
			};

			const updatedConfig = addCategory(config, "typescript");

			expect(updatedConfig.categories).toHaveLength(1);
			expect(updatedConfig.categories[0]).toBe("typescript");
		});

		it("should add multiple categories", async () => {
			const config: Config = {
				version: "1.0.0",
				agent: "cursor",
				categories: [],
			};

			let updatedConfig = addCategory(config, "typescript");
			updatedConfig = addCategory(updatedConfig, "react");

			expect(updatedConfig.categories).toHaveLength(2);
			expect(updatedConfig.categories[0]).toBe("typescript");
			expect(updatedConfig.categories[1]).toBe("react");
		});

		it("should not add duplicate categories", async () => {
			const config: Config = {
				version: "1.0.0",
				agent: "cursor",
				categories: ["typescript"],
			};

			const updatedConfig = addCategory(config, "typescript");

			expect(updatedConfig.categories).toHaveLength(1);
			expect(updatedConfig.categories[0]).toBe("typescript");
		});

		it("should preserve existing categories", async () => {
			const config: Config = {
				version: "1.0.0",
				agent: "cursor",
				categories: ["react"],
			};

			const updatedConfig = addCategory(config, "typescript");

			expect(updatedConfig.categories).toHaveLength(2);
			expect(updatedConfig.categories).toContain("react");
			expect(updatedConfig.categories).toContain("typescript");
		});
	});
});
