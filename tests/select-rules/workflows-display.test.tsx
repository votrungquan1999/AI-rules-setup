import { fireEvent, render, screen } from "@testing-library/react";
import { SelectRulesPageClient } from "src/app/select-rules/SelectRulesPageClient";
import { ManifestsProvider } from "src/lib/manifests.state";
import { SearchProvider } from "src/lib/search.state";
import { SelectionProvider } from "src/lib/selection.state";
import type { Manifest, RulesData, SkillFile, WorkflowFile } from "src/server/types";
import { describe, expect, it } from "vitest";

/**
 * Integration tests for Step 3: Workflows Display Component for Antigravity
 *
 * These tests render the actual component and verify that:
 * - Workflows section appears only for Antigravity agent
 * - Workflows are displayed when Antigravity is selected
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
 * Helper to create test rules data with workflows
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

describe("SelectRulesPageClient - Workflows Display (Step 3)", () => {
	it("should display workflows section only for Antigravity agent", () => {
		// Create test data with antigravity rules and workflows
		const rulesData = createRulesDataWithWorkflows([], ["typescript"], ["deploy-app"]);

		// Render with cursor - workflows should not be visible (cursor agent has no workflows)
		const { unmount } = renderWithProviders(rulesData, "cursor");

		// Workflows section should not be visible for cursor
		expect(screen.queryByTestId("workflows-section")).not.toBeInTheDocument();

		// Render with antigravity - workflows should be visible
		unmount();
		renderWithProviders(rulesData, "antigravity");

		// Workflows section should be visible for antigravity
		expect(screen.getByTestId("workflows-section")).toBeInTheDocument();
	});

	it("should display all available workflows for Antigravity", () => {
		const rulesData = createRulesDataWithWorkflows([], ["typescript"], ["deploy-app", "run-tests", "create-feature"]);

		renderWithProviders(rulesData, "antigravity");

		// All 3 workflows should be displayed
		expect(screen.getByText("deploy-app")).toBeInTheDocument();
		expect(screen.getByText("run-tests")).toBeInTheDocument();
		expect(screen.getByText("create-feature")).toBeInTheDocument();
	});

	it("should allow selecting workflows via checkbox", () => {
		const rulesData = createRulesDataWithWorkflows([], ["typescript"], ["deploy-app"]);

		renderWithProviders(rulesData, "antigravity");

		// Find the checkbox for the workflow
		const checkbox = screen.getByRole("checkbox", { name: /deploy-app/i });

		// Initially should not be checked
		expect(checkbox).not.toBeChecked();

		// Click the checkbox
		fireEvent.click(checkbox);

		// Should now be checked
		expect(checkbox).toBeChecked();
	});

	it("should include selected workflows in the generated CLI command", () => {
		const rulesData = createRulesDataWithWorkflows([], ["typescript"], ["deploy-app", "run-tests"]);

		renderWithProviders(rulesData, "antigravity");

		// Select both workflows
		const deployCheckbox = screen.getByRole("checkbox", { name: /deploy-app/i });
		const testsCheckbox = screen.getByRole("checkbox", { name: /run-tests/i });

		fireEvent.click(deployCheckbox);
		fireEvent.click(testsCheckbox);

		// Find the generated command section
		const commandHeading = screen.getByRole("heading", { name: "Generated Command" });
		const commandSection = commandHeading.closest("div");

		// Command section should include both workflows
		expect(commandSection?.textContent).toContain("--workflows deploy-app,run-tests");
	});

	it("should display selected workflows in sidebar", () => {
		const rulesData = createRulesDataWithWorkflows([], ["typescript"], ["deploy-app", "run-tests"]);

		renderWithProviders(rulesData, "antigravity");

		// Select both workflows
		const deployCheckbox = screen.getByRole("checkbox", { name: /deploy-app/i });
		const testsCheckbox = screen.getByRole("checkbox", { name: /run-tests/i });

		fireEvent.click(deployCheckbox);
		fireEvent.click(testsCheckbox);

		// Find the sidebar section with "Selected Rules" heading
		const sidebarHeading = screen.getByRole("heading", { name: /Selected Rules/i });
		const sidebarSection = sidebarHeading.parentElement?.parentElement;

		// Sidebar should show both workflows
		expect(sidebarSection?.textContent).toContain("deploy-app");
		expect(sidebarSection?.textContent).toContain("run-tests");
	});

	it("should include workflows in ChatGPT prompt", () => {
		const rulesData = createRulesDataWithWorkflows([], ["typescript"], ["deploy-app"]);

		renderWithProviders(rulesData, "antigravity");

		// Select the workflow
		const checkbox = screen.getByRole("checkbox", { name: /deploy-app/i });
		fireEvent.click(checkbox);

		// Find the ChatGPT prompt section
		const promptHeading = screen.getByRole("heading", { name: "ChatGPT Prompt" });
		const promptSection = promptHeading.closest("div");

		// Prompt should mention workflows
		expect(promptSection?.textContent).toContain("deploy-app");
	});
});
