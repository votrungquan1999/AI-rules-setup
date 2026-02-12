import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import { seedTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject } from "../helpers/test-setup-utils";

describe("E2E: Init Command - Skills Installation", () => {
	let testProjectPath: string;

	beforeEach(async () => {
		// Seed the test database with fixture data
		await seedTestDatabase();

		// Create a temporary test project directory
		testProjectPath = await createTestProject("init-skills-test");
	});

	afterEach(async () => {
		// Clean up the test project
		await cleanupTestProject(testProjectPath);
	});

	it("should not install any skills when --skills flag is not provided", async () => {
		// Arrange & Act
		const { result } = spawnCLI(["init", "--agent", "antigravity", "--categories", "all"], {
			cwd: testProjectPath,
			timeout: 30000,
		});

		const finalResult = await result;

		// Assert - command should succeed
		expect(finalResult.stderr).toBe("");
		expect(finalResult.exitCode).toBe(0);

		// Assert - verify rules were installed successfully
		const rulesPath = path.join(testProjectPath, ".agent", "rules");
		const rulesDir = await fs.readdir(rulesPath);
		expect(rulesDir.length).toBeGreaterThan(0);

		// Assert - verify .agent/skills directory does not exist
		const skillsPath = path.join(testProjectPath, ".agent", "skills");

		// Directory should not exist when no skills are installed
		await expect(fs.access(skillsPath)).rejects.toThrow();
	});

	it("should install only the specified skills when --skills flag is provided", async () => {
		// Step 1: Install ONLY test-quality-reviewer skill (claude-code has 3 skills total)
		const { result } = spawnCLI(
			["init", "--agent", "claude-code", "--categories", "all", "--skills", "test-quality-reviewer"],
			{
				cwd: testProjectPath,
				timeout: 30000,
			},
		);

		const { stdout, stderr, exitCode } = await result;
		console.log("=== FIRST INSTALL OUTPUT ===");
		console.log("stdout:", stdout);
		console.log("stderr:", stderr);
		console.log("exitCode:", exitCode);
		expect(exitCode).toBe(0);

		// Verify: Only 1 skill installed (test-quality-reviewer)
		const skillsDir = path.join(testProjectPath, ".claude", "skills");
		await fs.access(skillsDir);
		let installedSkills = await fs.readdir(skillsDir);
		expect(installedSkills).toHaveLength(1);
		expect(installedSkills).toContain("test-quality-reviewer");
		expect(installedSkills).not.toContain("feature-development-workflow");
		expect(installedSkills).not.toContain("structured-brainstorming");

		// Step 2: Install 2 DIFFERENT skills (feature-development-workflow, structured-brainstorming)
		// This proves the CLI installs ONLY what's specified, not all available skills
		const { result: result2 } = spawnCLI(
			[
				"init",
				"--agent",
				"claude-code",
				"--categories",
				"all",
				"--skills",
				"feature-development-workflow,test-quality-reviewer",
				"--overwrite-strategy",
				"force",
			],
			{
				cwd: testProjectPath,
				timeout: 30000,
			},
		);

		const output2 = await result2;
		expect(output2.exitCode).toBe(0);

		// Verify: Exactly 2 skills installed (the 2 we specified)
		installedSkills = await fs.readdir(skillsDir);
		expect(installedSkills).toHaveLength(2);
		expect(installedSkills).toContain("feature-development-workflow");
		expect(installedSkills).toContain("test-quality-reviewer");

		// Verify: test-quality-reviewer is NOT installed (even though it's available for claude-code)
		expect(installedSkills).not.toContain("structured-brainstorming");

		// Verify: Skill files have correct content
		const featureDevSkillPath = path.join(skillsDir, "feature-development-workflow", "SKILL.md");
		const featureDevContent = await fs.readFile(featureDevSkillPath, "utf-8");
		expect(featureDevContent).toContain("Feature Development Workflow");

		const brainstormSkillPath = path.join(skillsDir, "test-quality-reviewer", "SKILL.md");
		const brainstormContent = await fs.readFile(brainstormSkillPath, "utf-8");
		expect(brainstormContent).toContain("Test Quality Reviewer");
	});

	it("should warn about non-existent skills but install valid ones", async () => {
		// Act: Try to install a mix of valid and invalid skills
		const { result } = spawnCLI(
			[
				"init",
				"--agent",
				"claude-code",
				"--categories",
				"all",
				"--skills",
				"test-quality-reviewer,nonexistent-skill,feature-development-workflow",
			],
			{
				cwd: testProjectPath,
				timeout: 30000,
			},
		);

		const { stderr, exitCode } = await result;

		// Should succeed (exit code 0) even with invalid skills
		expect(exitCode).toBe(0);

		// Should show error about the non-existent skill in stderr
		expect(stderr).toContain("nonexistent-skill");
		expect(stderr.toLowerCase()).toMatch(/error|not found/);

		// Should install the valid skills
		const skillsDir = path.join(testProjectPath, ".claude", "skills");
		await fs.access(skillsDir);
		const installedSkills = await fs.readdir(skillsDir);

		// Should have 2 valid skills installed
		expect(installedSkills).toHaveLength(2);
		expect(installedSkills).toContain("test-quality-reviewer");
		expect(installedSkills).toContain("feature-development-workflow");
		expect(installedSkills).not.toContain("nonexistent-skill");
	});
});
