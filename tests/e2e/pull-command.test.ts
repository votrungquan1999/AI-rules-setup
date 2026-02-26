import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import {
	getTestDatabase,
	seedTestDatabase,
	storeRulesInTestDatabase,
	storeSkillsInTestDatabase,
	storeWorkflowsInTestDatabase,
} from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject, fileExists } from "../helpers/test-setup-utils";

describe("E2E: Pull Command", () => {
	let testProjectDir: string;

	beforeEach(async () => {
		await seedTestDatabase();
		testProjectDir = await createTestProject("pull-test");
	});

	afterEach(async () => {
		await cleanupTestProject(testProjectDir);
	});

	it("should pull updated rule content after upstream changes", async () => {
		// Arrange: run init to install rules
		const { result: initResult } = spawnCLI(
			["init", "--agent", "antigravity", "--categories", "component-architecture", "--overwrite-strategy", "force"],
			{ cwd: testProjectDir, timeout: 30000 },
		);
		const initOutput = await initResult;
		expect(initOutput.exitCode).toBe(0);

		// Verify original content is installed
		const rulePath = path.join(testProjectDir, ".agent/rules/file-structure-patterns.mdc");
		expect(await fileExists(testProjectDir, ".agent/rules/file-structure-patterns.mdc")).toBe(true);
		const originalContent = await fs.readFile(rulePath, "utf-8");
		expect(originalContent).toContain("Component Architecture");

		// Arrange: update rule content in DB to simulate upstream change
		const db = await getTestDatabase();
		await storeRulesInTestDatabase(db, {
			agent: "antigravity",
			category: "component-architecture",
			manifest: {
				id: "component-architecture",
				category: "component-architecture",
				tags: ["architecture"],
				description: "Updated component architecture",
				version: "2.0.0",
				lastUpdated: new Date().toISOString(),
				files: [{ path: "file-structure-patterns.mdc", description: "Updated patterns", required: true }],
				dependencies: [],
				conflicts: [],
				whenToUse: "when design components",
			},
			files: [
				{
					filename: "file-structure-patterns.mdc",
					content: "# UPDATED Component Architecture\n\nThis content was updated upstream.",
				},
			],
			githubCommitSha: "updated-sha",
		});

		// Act: run pull to re-install from config
		const { result: pullResult } = spawnCLI(["pull"], {
			cwd: testProjectDir,
			timeout: 30000,
		});
		const pullOutput = await pullResult;

		// Assert: pull should succeed
		expect(pullOutput.exitCode).toBe(0);

		// Assert: file should have the UPDATED content
		const updatedContent = await fs.readFile(rulePath, "utf-8");
		expect(updatedContent).toContain("UPDATED Component Architecture");
		expect(updatedContent).toContain("This content was updated upstream.");
	}, 60000);

	it("should pull updated skill content after upstream changes", async () => {
		// Arrange: run init to install skills
		const { result: initResult } = spawnCLI(
			[
				"init",
				"--agent",
				"antigravity",
				"--categories",
				"component-architecture",
				"--skills",
				"postgres-query",
				"--overwrite-strategy",
				"force",
			],
			{ cwd: testProjectDir, timeout: 30000 },
		);
		const initOutput = await initResult;
		expect(initOutput.exitCode).toBe(0);

		// Verify original skill content
		const skillPath = path.join(testProjectDir, ".agent/skills/postgres-query/SKILL.md");
		const originalContent = await fs.readFile(skillPath, "utf-8");
		expect(originalContent).toContain("PostgreSQL Query Helper");

		// Arrange: update skill content in DB
		const db = await getTestDatabase();
		await storeSkillsInTestDatabase(db, "antigravity", [
			{
				name: "postgres-query",
				content: "# UPDATED PostgreSQL Skill\n\nNew optimized query patterns.",
			},
		]);

		// Act: run pull
		const { result: pullResult } = spawnCLI(["pull"], {
			cwd: testProjectDir,
			timeout: 30000,
		});
		const pullOutput = await pullResult;

		// Assert
		expect(pullOutput.exitCode).toBe(0);
		const updatedContent = await fs.readFile(skillPath, "utf-8");
		expect(updatedContent).toContain("UPDATED PostgreSQL Skill");
	}, 60000);

	it("should pull updated workflow content after upstream changes", async () => {
		// Arrange: run init to install workflows
		const { result: initResult } = spawnCLI(
			[
				"init",
				"--agent",
				"antigravity",
				"--categories",
				"component-architecture",
				"--workflows",
				"deploy-to-production",
				"--overwrite-strategy",
				"force",
			],
			{ cwd: testProjectDir, timeout: 30000 },
		);
		const initOutput = await initResult;
		expect(initOutput.exitCode).toBe(0);

		// Verify original workflow content
		const workflowPath = path.join(testProjectDir, ".agent/workflows/deploy-to-production.md");
		const originalContent = await fs.readFile(workflowPath, "utf-8");
		expect(originalContent).toContain("Deploy to Production");

		// Arrange: update workflow content in DB
		const db = await getTestDatabase();
		await storeWorkflowsInTestDatabase(db, "antigravity", [
			{
				name: "deploy-to-production",
				content: "# UPDATED Deploy Workflow\n\nNew deployment steps with canary release.",
			},
		]);

		// Act: run pull
		const { result: pullResult } = spawnCLI(["pull"], {
			cwd: testProjectDir,
			timeout: 30000,
		});
		const pullOutput = await pullResult;

		// Assert
		expect(pullOutput.exitCode).toBe(0);
		const updatedContent = await fs.readFile(workflowPath, "utf-8");
		expect(updatedContent).toContain("UPDATED Deploy Workflow");
	}, 60000);

	it("should pull all updated content (rules, skills, and workflows) in a single run", async () => {
		// Arrange: init with all types
		const { result: initResult } = spawnCLI(
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
				"--overwrite-strategy",
				"force",
			],
			{ cwd: testProjectDir, timeout: 30000 },
		);
		expect((await initResult).exitCode).toBe(0);

		// Arrange: update ALL content in DB
		const db = await getTestDatabase();
		await storeRulesInTestDatabase(db, {
			agent: "antigravity",
			category: "component-architecture",
			manifest: {
				id: "component-architecture",
				category: "component-architecture",
				tags: ["architecture"],
				description: "V2 architecture",
				version: "2.0.0",
				lastUpdated: new Date().toISOString(),
				files: [{ path: "file-structure-patterns.mdc", description: "V2 patterns", required: true }],
				dependencies: [],
				conflicts: [],
				whenToUse: "when designing components",
			},
			files: [{ filename: "file-structure-patterns.mdc", content: "# V2 Rules Content" }],
			githubCommitSha: "v2-sha",
		});
		await storeSkillsInTestDatabase(db, "antigravity", [{ name: "postgres-query", content: "# V2 Skill Content" }]);
		await storeWorkflowsInTestDatabase(db, "antigravity", [
			{ name: "deploy-to-production", content: "# V2 Workflow Content" },
		]);

		// Act: pull
		const { result: pullResult } = spawnCLI(["pull"], {
			cwd: testProjectDir,
			timeout: 30000,
		});
		expect((await pullResult).exitCode).toBe(0);

		// Assert: all files reflect V2 content
		const ruleContent = await fs.readFile(
			path.join(testProjectDir, ".agent/rules/file-structure-patterns.mdc"),
			"utf-8",
		);
		expect(ruleContent).toContain("V2 Rules Content");

		const skillContent = await fs.readFile(path.join(testProjectDir, ".agent/skills/postgres-query/SKILL.md"), "utf-8");
		expect(skillContent).toContain("V2 Skill Content");

		const workflowContent = await fs.readFile(
			path.join(testProjectDir, ".agent/workflows/deploy-to-production.md"),
			"utf-8",
		);
		expect(workflowContent).toContain("V2 Workflow Content");
	}, 60000);
});
