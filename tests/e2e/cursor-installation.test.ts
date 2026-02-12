import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import { seedTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject, fileExists } from "../helpers/test-setup-utils";

describe("E2E: Cursor Installation Tests", () => {
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

	it("should install rules with Cursor agent", async () => {
		// Arrange
		testProjectDir = await createTestProject("cursor-install-test");

		// Act
		const { result } = spawnCLI(["init", "--agent", "cursor", "--categories", "component-architecture"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

		const finalResult = await result;

		// Assert
		expect(finalResult.stderr).toBe("");
		expect(finalResult.exitCode).toBe(0);

		// Verify Cursor file structure
		// Rules: .cursor/rules/<filename>
		const ruleExists = await fileExists(testProjectDir, ".cursor/rules/file-structure-patterns.mdc");
		expect(ruleExists).toBe(true);

		// Verify success message
		expect(finalResult.stdout).toContain("Successfully installed");
	}, 30000);
});
