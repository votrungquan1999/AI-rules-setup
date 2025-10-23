import { setTimeout } from "node:timers/promises";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CLIKey, sendKeys, spawnCLI } from "../helpers/cli-utils";
import { connectToTestDB, disconnectTestDB } from "../helpers/database-utils";
import { seedTestDatabase } from "../helpers/seed-test-database";
import {
	cleanupTestProject,
	createTestProject,
	fileExists,
	readConfig,
	waitForAPIReady,
} from "../helpers/test-setup-utils";

describe("Init Command - Basic Flow Tests", () => {
	let testProjectDir: string | undefined;

	beforeAll(async () => {
		// Connect to test database
		await connectToTestDB();

		// Seed database with test fixtures
		await seedTestDatabase();

		// Wait for API server to be ready
		await waitForAPIReady();
	});

	afterAll(async () => {
		// Disconnect from test database
		await disconnectTestDB();
	});

	beforeEach(async () => {
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
	 * Test: Complete init flow with mock API data
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Spawn CLI in interactive mode
	 * 3. Select default agent (cursor) by pressing Enter
	 * 4. Select first category by pressing Space
	 * 5. Confirm selection by pressing Enter
	 * 6. Wait for completion
	 *
	 * Assertions:
	 * - CLI exits with code 0
	 * - No stderr output
	 * - .ai-rules.json config file created with correct structure
	 * - Exactly 1 category selected
	 * - Success messages displayed
	 */
	it("should complete init flow with mock API data", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("init-success-test");

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

		// Select the category
		sendKeys(child, [CLIKey.Space]);

		await setTimeout(100);

		// Confirm selection
		sendKeys(child, [CLIKey.Enter]);

		// Wait for completion
		const finalResult = await result;

		// The test should always succeed with seeded data - no conditional logic!
		expect(finalResult.exitCode).toBe(0);
		expect(finalResult.stderr).toBe("");

		// Verify .ai-rules.json was created
		const config = await readConfig(testProjectDir);
		expect(config).not.toBeNull();
		expect(config?.version).toBe("1.0.0");
		expect(config?.agent).toBe("cursor");
		expect(config?.categories).toBeDefined();
		expect(Array.isArray(config?.categories)).toBe(true);

		// Verify exactly 1 category was selected
		expect(config?.categories).toHaveLength(1);

		// Verify success message
		expect(finalResult.stdout).toContain("Successfully installed");
		expect(finalResult.stdout).toContain("Configuration saved to .ai-rules.json");
	}, 30000); // 30 second timeout for full init flow

	/**
	 * Test: Create directory structure as needed
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Spawn CLI in interactive mode
	 * 3. Select default agent (cursor) by pressing Enter
	 * 4. Select first category by pressing Space
	 * 5. Confirm selection by pressing Enter
	 * 6. Wait for completion
	 *
	 * Assertions:
	 * - CLI exits with code 0
	 * - .cursor directory created
	 * - .cursor/rules directory created
	 */
	it("should create directory structure as needed", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("init-directory-test");

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

		// Select the category
		sendKeys(child, [CLIKey.Space]);

		await setTimeout(100);

		// Confirm selection
		sendKeys(child, [CLIKey.Enter]);

		// Wait for completion
		const finalResult = await result;

		// With seeded data, this should always succeed
		expect(finalResult.exitCode).toBe(0);

		// Check if directories were created
		const cursorDirExists = await fileExists(testProjectDir, ".cursor");
		const rulesDirExists = await fileExists(testProjectDir, ".cursor/rules");

		expect(cursorDirExists).toBe(true);
		expect(rulesDirExists).toBe(true);
	}, 30000);

	/**
	 * Test: Display success message with installed rules count summary
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Spawn CLI in interactive mode
	 * 3. Select default agent (cursor) by pressing Enter
	 * 4. Select first category by pressing Space
	 * 5. Confirm selection by pressing Enter
	 * 6. Wait for completion
	 *
	 * Assertions:
	 * - CLI exits with code 0
	 * - Success message displayed
	 * - Configuration saved message displayed
	 * - Rule count summary displayed (X rules installed)
	 * - File count summary displayed (X files created)
	 */
	it("should display success message with installed rules count summary", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("init-success-message-test");

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

		// Select the category
		sendKeys(child, [CLIKey.Space]);

		await setTimeout(100);

		// Confirm selection
		sendKeys(child, [CLIKey.Enter]);

		// Wait for completion
		const finalResult = await result;

		// With seeded data, this should always succeed
		expect(finalResult.exitCode).toBe(0);
		expect(finalResult.stdout).toContain("Successfully installed");
		expect(finalResult.stdout).toContain("Configuration saved to .ai-rules.json");

		// Verify rule count summary is displayed
		expect(finalResult.stdout).toMatch(/\d+\s+rule\s+categories/i);
		expect(finalResult.stdout).toMatch(/Installed:\s+\.cursor\/rules\/.*\.mdc/i);
	}, 30000);

	/**
	 * Test: Handle API errors gracefully
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Set API URL to non-existent server
	 * 3. Spawn CLI in interactive mode
	 * 4. Select default agent (cursor) by pressing Enter
	 * 5. Wait for completion
	 * 6. Restore original API URL
	 *
	 * Assertions:
	 * - CLI exits with error code 1
	 * - Error message about fetching agents displayed
	 */
	it("should handle API errors gracefully", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("init-api-error-test");

		// Temporarily change API URL to a non-existent server
		const originalUrl = process.env.AI_RULES_API_URL;
		process.env.AI_RULES_API_URL = "http://localhost:9999";

		try {
			// Spawn CLI in interactive mode
			const { child, result } = spawnCLI(["init"], {
				cwd: testProjectDir,
				timeout: 15000,
			});

			// Wait for CLI to be ready
			await setTimeout(200);

			// Just press enter to proceed past agent selection
			sendKeys(child, [CLIKey.Enter]);

			// Wait for completion
			const finalResult = await result;

			// Should exit with error code
			expect(finalResult.exitCode).toBe(1);
			expect(finalResult.stderr).toContain("Error fetching available agents");
		} finally {
			// Restore original URL
			if (originalUrl) {
				process.env.AI_RULES_API_URL = originalUrl;
			} else {
				delete process.env.AI_RULES_API_URL;
			}
		}
	}, 15000);

	/**
	 * Test: Select all categories when pressing 'a'
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Spawn CLI in interactive mode
	 * 3. Select default agent (cursor) by pressing Enter
	 * 4. Press 'a' to select all categories
	 * 5. Confirm selection by pressing Enter
	 * 6. Wait for completion
	 *
	 * Assertions:
	 * - CLI exits with code 0
	 * - Configuration file created
	 * - Multiple categories selected (more than 1)
	 */
	it("should select all categories when pressing 'a'", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("init-select-all-test");

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

		// Press 'a' to select all
		sendKeys(child, [CLIKey.a]);

		await setTimeout(100);

		// Confirm selection
		sendKeys(child, [CLIKey.Enter]);

		// Wait for completion
		const finalResult = await result;

		expect(finalResult.exitCode).toBe(0);

		// Verify all categories were installed
		const config = await readConfig(testProjectDir);
		expect(config).toBeDefined();
		expect(Array.isArray(config?.categories)).toBe(true);
		expect((config?.categories as string[]).length).toBeGreaterThan(1);
		// All available categories should be installed
	}, 30000);
});
