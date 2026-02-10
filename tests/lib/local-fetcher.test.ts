import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	discoverAgentsLocal,
	discoverCategoriesLocal,
	discoverSkillsLocal,
	discoverWorkflowsLocal,
	fetchAllRulesDataLocal,
	fetchDirectoryContentsLocal,
	fetchFileContentLocal,
	fetchManifestLocal,
} from "../../src/app/api/lib/local-fetcher";

// Use test fixtures instead of live rules directory for test resilience
const FIXTURE_ROOT = join(__dirname, "../fixtures/local-fetcher");

describe("Local Fetcher", () => {
	it("fetchDirectoryContentsLocal - should read directory contents from local filesystem", async () => {
		// Arrange
		const path = "rules";

		// Act
		const result = await fetchDirectoryContentsLocal(path, FIXTURE_ROOT);

		// Assert: Should return array with test-agent directory
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);

		// Should contain test-agent
		const dirNames = result.filter((entry) => entry.type === "dir").map((entry) => entry.name);
		expect(dirNames).toContain("test-agent");

		// Each entry should have required properties
		for (const entry of result) {
			expect(entry).toHaveProperty("name");
			expect(entry).toHaveProperty("path");
			expect(entry).toHaveProperty("type");
			expect(["file", "dir"]).toContain(entry.type);
		}
	});

	it("fetchFileContentLocal - should read file content from local filesystem", async () => {
		// Arrange
		const path = "rules/test-agent/test-category/manifest.json";

		// Act
		const content = await fetchFileContentLocal(path, FIXTURE_ROOT);

		// Assert
		expect(typeof content).toBe("string");
		expect(content.length).toBeGreaterThan(0);

		// Should be valid JSON with expected fields
		const parsed = JSON.parse(content);
		expect(parsed).toHaveProperty("id");
		expect(parsed).toHaveProperty("category");
		expect(parsed).toHaveProperty("files");
		expect(parsed.id).toBe("test-category");
	});

	it("discoverAgentsLocal - should discover all agents from /rules directory", async () => {
		// Act
		const agents = await discoverAgentsLocal(FIXTURE_ROOT);

		// Assert
		expect(Array.isArray(agents)).toBe(true);
		expect(agents).toContain("test-agent");
	});

	it("discoverCategoriesLocal - should discover categories for a given agent", async () => {
		// Act
		const categories = await discoverCategoriesLocal("test-agent", FIXTURE_ROOT);

		// Assert
		expect(Array.isArray(categories)).toBe(true);
		expect(categories.length).toBeGreaterThan(0);
		expect(categories).toContain("test-category");
	});

	it("fetchManifestLocal - should read and parse manifest.json for an agent/category", async () => {
		// Act
		const manifest = await fetchManifestLocal("test-agent", "test-category", FIXTURE_ROOT);

		// Assert
		expect(manifest).not.toBeNull();
		expect(manifest?.id).toBe("test-category");
		expect(manifest?.category).toBe("test-category");
		expect(manifest?.files).toBeDefined();
		expect(Array.isArray(manifest?.files)).toBe(true);
		expect(manifest?.files[0]?.path).toBe("rule.md");
	});

	it("discoverSkillsLocal - should discover skills for a given agent", async () => {
		// Act
		const skills = await discoverSkillsLocal("test-agent", FIXTURE_ROOT);

		// Assert
		expect(Array.isArray(skills)).toBe(true);
		expect(skills.length).toBeGreaterThan(0);

		// Should have test-skill
		const skillNames = skills.map((skill) => skill.name);
		expect(skillNames).toContain("test-skill");

		// Each skill should have name and content
		for (const skill of skills) {
			expect(skill).toHaveProperty("name");
			expect(skill).toHaveProperty("content");
			expect(typeof skill.name).toBe("string");
			expect(typeof skill.content).toBe("string");
		}
	});

	it("discoverWorkflowsLocal - should discover workflows for a given agent", async () => {
		// Act
		const workflows = await discoverWorkflowsLocal("test-agent", FIXTURE_ROOT);

		// Assert
		expect(Array.isArray(workflows)).toBe(true);
		expect(workflows.length).toBeGreaterThan(0);

		// Should have test-workflow
		const workflowNames = workflows.map((wf) => wf.name);
		expect(workflowNames).toContain("test-workflow");

		// Each workflow should have name and content
		for (const workflow of workflows) {
			expect(workflow).toHaveProperty("name");
			expect(workflow).toHaveProperty("content");
		}
	});

	it("fetchAllRulesDataLocal - should aggregate all rules data from local filesystem", async () => {
		// Act
		const data = await fetchAllRulesDataLocal(FIXTURE_ROOT);

		// Assert
		expect(data).toHaveProperty("agents");
		expect(data.agents).toHaveProperty("test-agent");

		// Check test-agent has categories
		const testAgent = data.agents["test-agent"];
		expect(testAgent).toBeDefined();
		expect(testAgent).toHaveProperty("categories");
		expect(testAgent?.categories["test-category"]).toBeDefined();

		// Check category has manifest and files
		const category = testAgent?.categories["test-category"];
		expect(category?.manifest).toBeDefined();
		expect(category?.manifest.id).toBe("test-category");
		expect(category?.files).toBeDefined();
		expect(Array.isArray(category?.files)).toBe(true);

		// Check test-agent has skills
		expect(testAgent).toHaveProperty("skills");
		expect(Array.isArray(testAgent?.skills)).toBe(true);
		expect(testAgent?.skills?.length).toBeGreaterThan(0);
	});
});
