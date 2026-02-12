import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import { seedTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject, fileExists } from "../helpers/test-setup-utils";

describe("E2E: Claude Code Installation Tests", () => {
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
	 * Expected skill names that should be installed for Claude Code
	 */
	const EXPECTED_SKILLS = [
		"feature-development-workflow",
		"structured-brainstorming",
		"test-quality-reviewer",
	] as const;

	/**
	 * Helper: Check if skill file exists and return its path
	 */
	const getSkillPath = (projectDir: string, skillName: string): string => {
		return join(projectDir, ".claude", "skills", skillName, "SKILL.md");
	};

	/**
	 * Helper: Read skill file content
	 */
	const readSkillFile = async (projectDir: string, skillName: string): Promise<string> => {
		const skillPath = getSkillPath(projectDir, skillName);
		return await readFile(skillPath, "utf-8");
	};

	/**
	 * Helper: Extract frontmatter from skill content
	 */
	const extractFrontmatter = (content: string): Record<string, string> => {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch || !frontmatterMatch[1]) {
			return {};
		}

		const frontmatterText = frontmatterMatch[1];
		const lines = frontmatterText.split("\n");
		const frontmatter: Record<string, string> = {};

		for (const line of lines) {
			const colonIndex = line.indexOf(":");
			if (colonIndex === -1) continue;

			const key = line.slice(0, colonIndex).trim();
			const value = line.slice(colonIndex + 1).trim();
			frontmatter[key] = value;
		}

		return frontmatter;
	};

	/**
	 * Test: Skills directory structure is created
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Run CLI with claude-code agent and a category
	 * 3. Wait for completion
	 *
	 * Assertions:
	 * - .claude/skills/ directory exists
	 * - Each skill has its own subdirectory
	 * - Each subdirectory contains SKILL.md file
	 */
	it("should create correct directory structure for skills", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("skills-directory-structure-test");

		// Run CLI with non-interactive options
		const { result } = spawnCLI(["init", "--agent", "claude-code", "--categories", "brainstorming-patterns"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

		// Wait for completion
		const finalResult = await result;

		// Should succeed
		expect(finalResult.exitCode).toBe(0);

		// Verify .claude/skills directory exists
		const skillsDirExists = await fileExists(testProjectDir, ".claude/skills");
		expect(skillsDirExists).toBe(true);

		// Verify each skill has its own subdirectory with SKILL.md
		for (const skillName of EXPECTED_SKILLS) {
			const skillDirExists = await fileExists(testProjectDir, `.claude/skills/${skillName}`);
			expect(skillDirExists).toBe(true);

			const skillFileExists = await fileExists(testProjectDir, `.claude/skills/${skillName}/SKILL.md`);
			expect(skillFileExists).toBe(true);
		}
	}, 30000);

	/**
	 * Test: Skill file content matches source content
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Run CLI with claude-code agent and a category
	 * 3. Wait for completion
	 * 4. Read each skill file
	 *
	 * Assertions:
	 * - Each skill file has content (not empty)
	 * - Each skill file has frontmatter with name field
	 * - Each skill file has frontmatter with description field
	 * - Frontmatter name matches expected skill name
	 */
	it("should preserve skill file content and frontmatter", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("skills-content-test");

		// Run CLI with non-interactive options
		const { result } = spawnCLI(["init", "--agent", "claude-code", "--categories", "brainstorming-patterns"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

		// Wait for completion
		const finalResult = await result;
		expect(finalResult.exitCode).toBe(0);

		// Read and verify each skill file
		for (const skillName of EXPECTED_SKILLS) {
			const content = await readSkillFile(testProjectDir, skillName);

			// File should have content
			expect(content.length).toBeGreaterThan(0);

			// Extract frontmatter
			const frontmatter = extractFrontmatter(content);

			// Should have name field
			expect(frontmatter.name).toBeDefined();
			expect(frontmatter.name).toBe(skillName);

			// Should have description field
			expect(frontmatter.description).toBeDefined();

			// @ts-ignore: this is for test, and already check description defined in previous step
			expect(frontmatter.description.length).toBeGreaterThan(0);

			// If skill has allowed-tools, it should be preserved
			if (skillName === "test-quality-reviewer") {
				expect(content).toContain("allowed-tools:");
			}
		}
	}, 30000);

	/**
	 * Test: All available skills are installed
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Run CLI with claude-code agent and a category
	 * 3. Wait for completion
	 *
	 * Assertions:
	 * - All expected skills are installed
	 * - Skill count matches expected count
	 * - Success message includes skills count
	 */
	it("should install all available Claude Code skills", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("skills-all-test");

		// Run CLI with non-interactive options
		const { result } = spawnCLI(["init", "--agent", "claude-code", "--categories", "brainstorming-patterns"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

		// Wait for completion
		const finalResult = await result;
		expect(finalResult.exitCode).toBe(0);

		// Verify all skills are installed
		let installedCount = 0;

		for (const skillName of EXPECTED_SKILLS) {
			const skillFileExists = await fileExists(testProjectDir, `.claude/skills/${skillName}/SKILL.md`);
			if (skillFileExists) {
				installedCount++;
			}
		}

		expect(installedCount).toBe(EXPECTED_SKILLS.length);

		// Verify success message mentions skills
		expect(finalResult.stdout).toContain("Checking for available skills");
		expect(finalResult.stdout).toContain("Successfully installed");
		expect(finalResult.stdout).toContain("skills");
	}, 30000);

	/**
	 * Test: Skills are installed alongside rules
	 *
	 * Flow:
	 * 1. Create test project directory
	 * 2. Run CLI with claude-code agent and a category
	 * 3. Wait for completion
	 *
	 * Assertions:
	 * - Rules directory exists (.claude/rules)
	 * - Skills directory exists (.claude/skills)
	 * - Both rules and skills are installed
	 * - Success messages for both rules and skills
	 */
	it("should install skills alongside rules for Claude Code", async () => {
		// Create test project directory
		testProjectDir = await createTestProject("skills-with-rules-test");

		// Run CLI with non-interactive options
		const { result } = spawnCLI(["init", "--agent", "claude-code", "--categories", "brainstorming-patterns"], {
			cwd: testProjectDir,
			timeout: 30000,
		});

		// Wait for completion
		const finalResult = await result;
		expect(finalResult.exitCode).toBe(0);

		// Verify both directories exist
		const rulesDirExists = await fileExists(testProjectDir, ".claude/rules");
		const skillsDirExists = await fileExists(testProjectDir, ".claude/skills");

		expect(rulesDirExists).toBe(true);
		expect(skillsDirExists).toBe(true);

		// Verify success messages for both
		expect(finalResult.stdout).toContain("Checking for available skills");
		expect(finalResult.stdout).toContain("Successfully installed");
		expect(finalResult.stdout).toContain("skills");
	}, 30000);
});
