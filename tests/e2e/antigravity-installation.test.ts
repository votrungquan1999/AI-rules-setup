import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import { seedTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject, fileExists } from "../helpers/test-setup-utils";

describe("E2E: Antigravity Installation Tests", () => {
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

	it("should install rules, skills, and workflows with Antigravity agent", async () => {
		// Arrange
		testProjectDir = await createTestProject("antigravity-install-test");

		// Act
		const { result } = spawnCLI(
			[
				"init",
				"--agent",
				"antigravity",
				"--categories",
				"component-architecture",
				"--skills",
				"postgres-query",
				"--workflows",
				"deploy-to-production",
			],
			{
				cwd: testProjectDir,
				timeout: 30000,
			},
		);

		const finalResult = await result;

		// Assert
		expect(finalResult.stderr).toBe("");
		expect(finalResult.exitCode).toBe(0);

		// Verify Antigravity file structure
		// Rules: .agent/rules/<filename>
		const ruleExists = await fileExists(testProjectDir, ".agent/rules/file-structure-patterns.mdc");
		expect(ruleExists).toBe(true);

		// Skills: .agent/skills/<skill-name>/SKILL.md
		const skillExists = await fileExists(testProjectDir, ".agent/skills/postgres-query/SKILL.md");
		expect(skillExists).toBe(true);

		// Workflows: .agent/workflows/<workflow-name>.md
		const workflowExists = await fileExists(testProjectDir, ".agent/workflows/deploy-to-production.md");
		expect(workflowExists).toBe(true);
	}, 30000);
});
