import { render, screen } from "@testing-library/react";
import { SelectRulesPageClient } from "src/app/select-rules/SelectRulesPageClient";
import { ManifestsProvider } from "src/lib/manifests.state";
import { SearchProvider } from "src/lib/search.state";
import { SelectionProvider } from "src/lib/selection.state";
import type { Manifest, RulesData, SkillFile, WorkflowFile } from "src/server/types";
import { describe, expect, it } from "vitest";

/**
 * Integration tests for Step 4: Display Order Verification
 *
 * These tests verify that workflows are displayed in the correct order (after skills)
 */

/**
 * Helper to create test manifest
 */
function createManifest(id: string, description: string): Manifest {
	return {
		id,
		category: id,
		tags: [id],
		description,
		whenToUse: `When using ${id}`,
		files: [],
	};
}

/**
 * Helper to create test workflow
 */
function createWorkflow(name: string): WorkflowFile {
	return {
		name,
		content: `---\ndescription: ${name}\n---\n# ${name} workflow`,
	};
}

/**
 * Helper to create test skill
 */
function createSkill(name: string): SkillFile {
	return {
		name,
		content: `---\ndescription: ${name} skill\n---\n# ${name}`,
	};
}

/**
 * Helper to create test rules data with workflows and skills
 */
function createRulesDataWithWorkflows(
	cursorRules: string[],
	antigravityRules: string[],
	antigravityWorkflows: string[],
	antigravitySkills: string[] = [],
): RulesData {
	const agents: RulesData["agents"] = {};

	if (cursorRules.length > 0) {
		agents.cursor = {
			categories: Object.fromEntries(
				cursorRules.map((id) => [
					id,
					{
						manifest: createManifest(id, `${id} rules for Cursor`),
						files: [],
					},
				]),
			),
		};
	}

	if (antigravityRules.length > 0 || antigravityWorkflows.length > 0 || antigravitySkills.length > 0) {
		const antigravityAgent: RulesData["agents"]["antigravity"] = {
			categories: Object.fromEntries(
				antigravityRules.map((id) => [
					id,
					{
						manifest: createManifest(id, `${id} rules for Antigravity`),
						files: [],
					},
				]),
			),
		};

		if (antigravitySkills.length > 0) {
			antigravityAgent.skills = antigravitySkills.map((name) => createSkill(name));
		}

		if (antigravityWorkflows.length > 0) {
			antigravityAgent.workflows = antigravityWorkflows.map((name) => createWorkflow(name));
		}

		agents.antigravity = antigravityAgent;
	}

	return { agents };
}

/**
 * Helper to render component with providers
 */
function renderWithProviders(rulesData: RulesData, agent: string) {
	const agents = Object.keys(rulesData.agents);
	return render(
		<SelectionProvider defaultAgent={agent}>
			<ManifestsProvider rulesData={rulesData} questions={[]} agents={agents}>
				<SearchProvider>
					<SelectRulesPageClient />
				</SearchProvider>
			</ManifestsProvider>
		</SelectionProvider>,
	);
}

describe("SelectRulesPageClient - Display Order (Step 4)", () => {
	it("should display workflows after skills in Antigravity display", () => {
		// Create rules data with both skills and workflows
		const rulesData = createRulesDataWithWorkflows([], ["typescript"], ["deploy-app"], ["test-skill"]);

		renderWithProviders(rulesData, "antigravity");

		// Get all section headings (h2 elements)
		const headings = screen.getAllByRole("heading", { level: 2 });
		const headingTexts = headings.map((h) => h.textContent);

		// Find the indices of Skills, Workflows, and Rules headings
		const skillsIndex = headingTexts.indexOf("Skills");
		const workflowsIndex = headingTexts.indexOf("Workflows");
		const rulesIndex = headingTexts.indexOf("Rules");

		// Verify all sections exist
		expect(skillsIndex).toBeGreaterThan(-1);
		expect(workflowsIndex).toBeGreaterThan(-1);
		expect(rulesIndex).toBeGreaterThan(-1);

		// Verify correct order: Skills → Workflows → Rules
		expect(skillsIndex).toBeLessThan(workflowsIndex);
		expect(workflowsIndex).toBeLessThan(rulesIndex);
	});
});
