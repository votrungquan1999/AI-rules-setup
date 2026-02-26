import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import { seedTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject, readConfig } from "../helpers/test-setup-utils";

describe("E2E: Init Command - Config Persistence", () => {
	let testProjectDir: string | undefined;

	beforeEach(async () => {
		await seedTestDatabase();

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

	it("should persist categories, skills, and workflows to .ai-rules.json", async () => {
		// Arrange
		testProjectDir = await createTestProject("config-persistence-test");

		// Act: init with antigravity agent specifying categories, skills, and workflows
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
				"deploy-to-production,setup-ci-cd",
			],
			{
				cwd: testProjectDir,
				timeout: 30000,
			},
		);

		const finalResult = await result;

		// Assert - command should succeed
		expect(finalResult.stderr).toBe("");
		expect(finalResult.exitCode).toBe(0);

		// Assert - .ai-rules.json should contain all 3 fields
		const config = await readConfig(testProjectDir);
		expect(config).not.toBeNull();

		expect(config).toMatchObject({
			agent: "antigravity",
			categories: ["component-architecture"],
			skills: ["postgres-query"],
			workflows: ["deploy-to-production", "setup-ci-cd"],
		});
	}, 30000);
});
