import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import { seedTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject, fileExists, readConfig } from "../helpers/test-setup-utils";

describe("E2E: Init Command - Basic Flow Tests", () => {
	let testProjectDir: string | undefined;

	beforeEach(async () => {
		// Seed database with test fixtures (database is fresh for each test)
		await seedTestDatabase();

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
	 * Test: Complete init flow with non-interactive options
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Run CLI with --agent and --categories flags
	 * 3. Wait for completion
	 *
	 * Assertions:
	 * - CLI exits with code 0
	 * - No stderr output
	 * - .ai-rules.json config file created with correct structure
	 * - Exactly 1 category selected
	 * - Success messages displayed
	 */
	it("should complete init flow with non-interactive options", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("init-success-test");

		// Run CLI with non-interactive options
		const { result } = spawnCLI(["init", "--agent", "cursor", "--categories", "component-architecture"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

		// Wait for completion
		const finalResult = await result;

		// The test should always succeed with seeded data
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
		expect(config?.categories).toContain("component-architecture");

		// Verify success message
		expect(finalResult.stdout).toContain("Successfully installed");
		expect(finalResult.stdout).toContain("Configuration saved to .ai-rules.json");
	}, 30000);

	/**
	 * Test: Create directory structure as needed
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Run CLI with non-interactive options
	 * 3. Wait for completion
	 *
	 * Assertions:
	 * - CLI exits with code 0
	 * - .cursor directory created
	 * - .cursor/rules directory created
	 */
	it("should create directory structure as needed", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("init-directory-test");

		// Run CLI with non-interactive options
		const { result } = spawnCLI(["init", "--agent", "cursor", "--categories", "component-architecture"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

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
	 * 2. Run CLI with non-interactive options
	 * 3. Wait for completion
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

		// Run CLI with non-interactive options
		const { result } = spawnCLI(["init", "--agent", "cursor", "--categories", "component-architecture"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

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
	 * 3. Run CLI with non-interactive options
	 * 4. Wait for completion
	 * 5. Restore original API URL
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
			// Run CLI with non-interactive options
			const { result } = spawnCLI(["init", "--agent", "cursor", "--categories", "component-architecture"], {
				cwd: testProjectDir,
				timeout: 15000,
			});

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
	 * Test: Select multiple categories
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Run CLI with multiple categories
	 * 3. Wait for completion
	 *
	 * Assertions:
	 * - CLI exits with code 0
	 * - Configuration file created
	 * - Multiple categories selected
	 */
	it("should install multiple categories", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("init-multiple-categories-test");

		// Run CLI with multiple categories
		const { result } = spawnCLI(
			["init", "--agent", "cursor", "--categories", "component-architecture,database-patterns"],
			{
				cwd: testProjectDir,
				timeout: 30000,
			},
		);

		// Wait for completion
		const finalResult = await result;

		expect(finalResult.exitCode).toBe(0);

		// Verify multiple categories were installed
		const config = await readConfig(testProjectDir);
		expect(config).toBeDefined();
		expect(Array.isArray(config?.categories)).toBe(true);
		expect((config?.categories as string[]).length).toBe(2);
		expect(config?.categories).toContain("component-architecture");
		expect(config?.categories).toContain("database-patterns");
	}, 30000);
});
