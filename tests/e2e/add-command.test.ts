import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import { seedTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject } from "../helpers/test-setup-utils";

describe("E2E: Add Command", () => {
	let testProjectPath: string;

	beforeEach(async () => {
		await seedTestDatabase();
		testProjectPath = await createTestProject("add-command-test");
	});

	afterEach(async () => {
		await cleanupTestProject(testProjectPath);
	});

	/**
	 * Helper to initialize a project with a given agent and categories
	 */
	async function initProject(agent: string, categories: string): Promise<void> {
		const { result } = spawnCLI(
			["init", "--agent", agent, "--categories", categories, "--overwrite-strategy", "force"],
			{ cwd: testProjectPath, timeout: 30000 },
		);
		const output = await result;
		expect(output.exitCode).toBe(0);
	}

	it("should add a new category to an existing initialized project", async () => {
		// Given an initialized project with agent "claude-code" and category "component-architecture"
		await initProject("claude-code", "component-architecture");

		const configBefore = JSON.parse(await fs.readFile(path.join(testProjectPath, ".ai-rules.json"), "utf-8"));
		expect(configBefore.categories).toHaveLength(1);
		expect(configBefore.categories).toContain("component-architecture");

		// When I run `add --categories database-patterns`
		const { result } = spawnCLI(
			["add", "--categories", "database-patterns", "--overwrite-strategy", "force"],
			{ cwd: testProjectPath, timeout: 30000 },
		);

		const { exitCode, stderr } = await result;
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);

		// Then the config contains both categories
		const configAfter = JSON.parse(await fs.readFile(path.join(testProjectPath, ".ai-rules.json"), "utf-8"));
		expect(configAfter.categories).toContain("component-architecture");
		expect(configAfter.categories).toContain("database-patterns");
	});

	it("should add a skill to an existing initialized project", async () => {
		// Given an initialized project with agent "antigravity" and no skills
		await initProject("antigravity", "component-architecture");

		// When I run `add --skills postgres-query`
		const { result } = spawnCLI(["add", "--skills", "postgres-query"], {
			cwd: testProjectPath,
			timeout: 30000,
		});

		const { exitCode, stderr } = await result;
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);

		// Then the skill file is written
		const skillPath = path.join(testProjectPath, ".agents", "skills", "postgres-query", "SKILL.md");
		const skillContent = await fs.readFile(skillPath, "utf-8");
		expect(skillContent).toContain("PostgreSQL");

		// And .ai-rules.json lists "postgres-query" in skills array
		const config = JSON.parse(await fs.readFile(path.join(testProjectPath, ".ai-rules.json"), "utf-8"));
		expect(config.skills).toContain("postgres-query");
	});

	it("should add a workflow to an existing initialized project", async () => {
		// Given an initialized project with agent "antigravity" and no workflows
		await initProject("antigravity", "component-architecture");

		// When I run `add --workflows deploy-to-production`
		const { result } = spawnCLI(["add", "--workflows", "deploy-to-production"], {
			cwd: testProjectPath,
			timeout: 30000,
		});

		const { exitCode, stderr } = await result;
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);

		// Then the workflow file is written
		const workflowPath = path.join(testProjectPath, ".agents", "workflows", "deploy-to-production.md");
		const workflowContent = await fs.readFile(workflowPath, "utf-8");
		expect(workflowContent).toContain("Deploy to Production");

		// And .ai-rules.json lists "deploy-to-production" in workflows array
		const config = JSON.parse(await fs.readFile(path.join(testProjectPath, ".ai-rules.json"), "utf-8"));
		expect(config.workflows).toContain("deploy-to-production");
	});

	it("should add all available categories with --categories all", async () => {
		// Given an initialized project with only 1 category
		await initProject("claude-code", "component-architecture");

		// When I run `add --categories all`
		const { result } = spawnCLI(
			["add", "--categories", "all", "--overwrite-strategy", "force"],
			{ cwd: testProjectPath, timeout: 30000 },
		);

		const { exitCode, stderr } = await result;
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);

		// Then config contains all 10 claude-code categories
		const config = JSON.parse(await fs.readFile(path.join(testProjectPath, ".ai-rules.json"), "utf-8"));
		expect(config.categories.length).toBe(10);
		expect(config.categories).toContain("component-architecture");
		expect(config.categories).toContain("database-patterns");
		expect(config.categories).toContain("meta-rules");
	});

	it("should not duplicate already-installed items", async () => {
		// Given an initialized project with component-architecture already installed
		await initProject("claude-code", "component-architecture");

		// When I run `add --categories component-architecture` (already installed)
		const { result } = spawnCLI(
			["add", "--categories", "component-architecture", "--overwrite-strategy", "force"],
			{ cwd: testProjectPath, timeout: 30000 },
		);

		const { exitCode } = await result;
		expect(exitCode).toBe(0);

		// Then config still has only 1 entry for component-architecture (no duplicates)
		const config = JSON.parse(await fs.readFile(path.join(testProjectPath, ".ai-rules.json"), "utf-8"));
		const matches = config.categories.filter((c: string) => c === "component-architecture");
		expect(matches).toHaveLength(1);
	});

	it("should error when no .ai-rules.json exists", async () => {
		// Given a fresh directory with NO .ai-rules.json (no init run)
		// When I run `add --categories component-architecture`
		const { result } = spawnCLI(["add", "--categories", "component-architecture"], {
			cwd: testProjectPath,
			timeout: 30000,
		});

		const { exitCode, stderr } = await result;

		// Then the command fails with an error about missing config
		expect(exitCode).not.toBe(0);
		expect(stderr).toContain("No .ai-rules.json found");
	});
});
