import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import { seedTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject } from "../helpers/test-setup-utils";

describe("E2E: Init Command - 'all' keyword for Skills and Workflows", () => {
	let testProjectPath: string;

	beforeEach(async () => {
		await seedTestDatabase();
		testProjectPath = await createTestProject("init-all-test");
	});

	afterEach(async () => {
		await cleanupTestProject(testProjectPath);
	});

	it("should install all available skills when --skills all is used", async () => {
		// claude-code has 3 skills: feature-development-workflow, structured-brainstorming, test-quality-reviewer
		const { result } = spawnCLI(
			[
				"init",
				"--agent",
				"claude-code",
				"--categories",
				"component-architecture",
				"--skills",
				"all",
				"--overwrite-strategy",
				"force",
			],
			{ cwd: testProjectPath, timeout: 30000 },
		);

		const { exitCode, stderr } = await result;
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);

		// Verify all 3 skills are installed
		const skillsDir = path.join(testProjectPath, ".claude", "skills");
		const installedSkills = await fs.readdir(skillsDir);
		expect(installedSkills).toHaveLength(3);
		expect(installedSkills).toContain("feature-development-workflow");
		expect(installedSkills).toContain("structured-brainstorming");
		expect(installedSkills).toContain("test-quality-reviewer");

		// Verify config tracks all skills
		const configPath = path.join(testProjectPath, ".ai-rules.json");
		const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
		expect(config.skills).toHaveLength(3);
		expect(config.skills).toContain("feature-development-workflow");
		expect(config.skills).toContain("structured-brainstorming");
		expect(config.skills).toContain("test-quality-reviewer");
	});

	it("should install all available workflows when --workflows all is used", async () => {
		// claude-code has 2 workflows: deploy-to-production, setup-ci-cd
		const { result } = spawnCLI(
			[
				"init",
				"--agent",
				"claude-code",
				"--categories",
				"component-architecture",
				"--workflows",
				"all",
				"--overwrite-strategy",
				"force",
			],
			{ cwd: testProjectPath, timeout: 30000 },
		);

		const { exitCode, stderr } = await result;
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);

		// Verify both workflows are installed
		const workflowsDir = path.join(testProjectPath, ".agents", "workflows");
		const installedWorkflows = await fs.readdir(workflowsDir);
		expect(installedWorkflows).toHaveLength(2);
		expect(installedWorkflows).toContain("deploy-to-production.md");
		expect(installedWorkflows).toContain("setup-ci-cd.md");

		// Verify config tracks all workflows
		const configPath = path.join(testProjectPath, ".ai-rules.json");
		const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
		expect(config.workflows).toHaveLength(2);
		expect(config.workflows).toContain("deploy-to-production");
		expect(config.workflows).toContain("setup-ci-cd");
	});
});
