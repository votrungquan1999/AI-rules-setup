import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RulesDataToStore } from "../../src/server/types";
import { CLIKey, sendKeys, spawnCLI } from "../helpers/cli-utils";
import {
	cleanDatabase,
	connectToTestDB,
	disconnectTestDB,
	getStoredCategoriesForAgent,
	getStoredRulesCount,
	seedDatabase,
} from "../helpers/database-utils";
import { cleanupTestProject, createTestProject, readConfig, waitForAPIReady } from "../helpers/test-setup-utils";

describe("Init Command - MongoDB Cache Tests", () => {
	let testProjectDir: string | undefined;

	beforeAll(async () => {
		// Set environment variable to use test data
		process.env.AI_RULES_USE_TEST_DATA = "true";
		process.env.AI_RULES_TEST_DATA_PATH = "./tests/fixtures/github-responses.json";

		// Connect to test database
		await connectToTestDB();

		// Wait for API server to be ready
		await waitForAPIReady();
	});

	afterAll(async () => {
		// Disconnect from test database
		await disconnectTestDB();
	});

	beforeEach(async () => {
		// Clean database before each cache test
		await cleanDatabase();

		// Clean up any existing test project
		if (testProjectDir) {
			await cleanupTestProject(testProjectDir);
			testProjectDir = undefined;
		}
	});

	afterEach(async () => {
		if (testProjectDir) {
			await cleanupTestProject(testProjectDir);
		}
	});

	/**
	 * Test: Fetch from mock API and cache to MongoDB when DB is empty
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Verify database is empty
	 * 3. Spawn CLI in interactive mode
	 * 4. Select default agent (cursor) by pressing Enter
	 * 5. Select first category by pressing Space
	 * 6. Confirm selection by pressing Enter
	 * 7. Wait for completion
	 *
	 * Assertions:
	 * - CLI exits with code 0
	 * - All categories cached in MongoDB (not just selected one)
	 * - Specific categories exist in database
	 * - Configuration file created with 1 selected category
	 * - Rule files created in .cursor/rules directory
	 */
	it("should fetch from mock API and cache to MongoDB when DB is empty", async () => {
		// Create test project
		testProjectDir = await createTestProject("cache-test-empty-db");

		// Verify database is empty
		const initialCount = await getStoredRulesCount();
		expect(initialCount).toBe(0);

		// Spawn CLI in interactive mode
		const { child, result } = spawnCLI(["init"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

		// Wait for CLI to be ready
		await setTimeout(200);

		// Select agent (cursor is default, just press enter)
		sendKeys(child, [CLIKey.Enter]);

		// Wait for category selection prompt
		await setTimeout(1000);

		// Select the first category (press space to select it)
		sendKeys(child, [CLIKey.Space]);

		// Wait for selection to be processed
		await setTimeout(500);

		// Confirm selection
		sendKeys(child, [CLIKey.Enter]);

		// Wait for completion
		const finalResult = await result;

		// Verify CLI succeeded
		expect(finalResult.exitCode).toBe(0);
		expect(finalResult.stderr).toBe("");

		// Verify ALL categories were cached in MongoDB (not just the selected one)
		const allCategories = await getStoredCategoriesForAgent("cursor");
		expect(allCategories.length).toBeGreaterThan(1); // Should have multiple categories

		// Verify we have the expected number of categories cached
		expect(allCategories.length).toBe(8); // Should have all 8 categories

		// Verify files were created
		const config = await readConfig(testProjectDir);
		expect(config).toBeDefined();
		expect(config?.agent).toBe("cursor");
		expect(config?.categories).toHaveLength(1);

		// Verify rule files exist (check for any .mdc file in rules directory)
		const rulesDir = join(testProjectDir, ".cursor/rules");
		const ruleFiles = await readdir(rulesDir).catch(() => []);
		const mdcFiles = ruleFiles.filter((file) => file.endsWith(".mdc"));
		expect(mdcFiles.length).toBeGreaterThan(0);
	});

	/**
	 * Test: Use MongoDB cache when available
	 *
	 * Flow:
	 * 1. Pre-seed database with typescript data
	 * 2. Verify data is in database
	 * 3. Create test project directory
	 * 4. Spawn CLI in interactive mode
	 * 5. Select default agent (cursor) by pressing Enter
	 * 6. Select all categories by pressing 'a'
	 * 7. Confirm selection by pressing Enter
	 * 8. Wait for completion
	 *
	 * Assertions:
	 * - CLI exits with code 0
	 * - Database count unchanged (cache hit)
	 * - Configuration file created with 1 selected category
	 * - Rule files created from cache
	 */
	it("should use MongoDB cache when available", async () => {
		// Pre-seed database with typescript data
		const testData: RulesDataToStore = {
			agent: "cursor",
			category: "typescript",
			manifest: {
				id: "typescript",
				category: "typescript",
				tags: ["language", "typescript"],
				description: "TypeScript conventions",
				version: "1.0.0",
				files: [
					{
						path: "typescript.mdc",
						description: "Core TypeScript conventions",
						required: true,
					},
					{
						path: "typescript-imports-exports.mdc",
						description: "Import and export patterns",
						required: true,
					},
				],
			},
			files: [
				{
					filename: "typescript.mdc",
					content:
						"# TypeScript Conventions\n\n## General Rules\n\n- ALWAYS hoist `type` aliases and `interface` definitions to the top of the file.",
				},
				{
					filename: "typescript-imports-exports.mdc",
					content:
						"# TypeScript Imports and Exports\n\n## Import Rules\n\n- ALWAYS use proper import statements instead of inline imports.",
				},
			],
			githubCommitSha: "test-sha",
		};

		await seedDatabase(testData);

		// Verify data is in database
		const initialCount = await getStoredRulesCount();
		expect(initialCount).toBe(1);

		// Create test project
		testProjectDir = await createTestProject("cache-test-cache-hit");

		// Spawn CLI in interactive mode
		const { child, result } = spawnCLI(["init"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

		// Wait for CLI to be ready
		await setTimeout(200);

		// Select agent (cursor is default, just press enter)
		sendKeys(child, [CLIKey.Enter]);

		// Wait for category selection prompt
		await setTimeout(500);

		// Select all categories (only 1 category available: typescript)
		sendKeys(child, [CLIKey.a]);

		await setTimeout(100);

		// Confirm selection
		sendKeys(child, [CLIKey.Enter]);

		// Wait for completion
		const finalResult = await result;

		// Verify CLI succeeded
		expect(finalResult.exitCode).toBe(0);
		expect(finalResult.stderr).toBe("");

		// Verify database count didn't change (cache hit)
		const finalCount = await getStoredRulesCount();
		expect(finalCount).toBe(1);

		// Verify files were created from cache
		const config = await readConfig(testProjectDir);
		expect(config).toBeDefined();
		expect(config?.agent).toBe("cursor");
		expect(config?.categories).toHaveLength(1);

		// Verify rule files exist (check for any .mdc file in rules directory)
		const rulesDir = join(testProjectDir, ".cursor/rules");
		const ruleFiles = await readdir(rulesDir).catch(() => []);
		const mdcFiles = ruleFiles.filter((file) => file.endsWith(".mdc"));
		expect(mdcFiles.length).toBeGreaterThan(0);
	});

	/**
	 * Test: Handle partial MongoDB cache with GitHub fallback
	 *
	 * Flow: (TODO - Not implemented yet)
	 * 1. Pre-seed database with outdated rules data
	 * 2. Create test project directory
	 * 3. Spawn CLI in interactive mode
	 * 4. Select categories
	 * 5. Wait for completion
	 *
	 * Assertions: (TODO - Not implemented yet)
	 * - CLI should detect version mismatch
	 * - Should fetch fresh data from GitHub
	 * - Should update cache with new data
	 * - Should install latest rules
	 */
	it.todo("should handle partial MongoDB cache with GitHub fallback", async () => {
		// TODO: implement this test, basically, when there are mismatch in version of rules, which is not implemented yet.
	});
});
