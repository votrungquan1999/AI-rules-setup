import { fireEvent, render, screen } from "@testing-library/react";
import { SelectRulesPageClient } from "src/app/select-rules/SelectRulesPageClient";
import { ManifestsProvider } from "src/lib/manifests.state";
import { SearchProvider } from "src/lib/search.state";
import { SelectionProvider } from "src/lib/selection.state";
import type { Manifest, RulesData, SkillFile } from "src/server/types";
import { describe, expect, it } from "vitest";

/**
 * Integration tests for Step 4: Skills Display Component for Claude Code
 *
 * These tests render the actual component and verify that:
 * - Skills section appears only for Claude Code agent
 * - Skills are displayed when Claude Code is selected
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
 * Helper to create test skill
 */
function createSkill(name: string): SkillFile {
	return {
		name,
		content: `---\nname: ${name}\ndescription: ${name} skill\n---\n# ${name}`,
	};
}

/**
 * Helper to create test rules data with skills
 */
function createRulesDataWithSkills(
	cursorRules: string[],
	claudeCodeRules: string[],
	claudeCodeSkills: string[],
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

	if (claudeCodeRules.length > 0 || claudeCodeSkills.length > 0) {
		const claudeCodeAgent: RulesData["agents"]["claude-code"] = {
			categories: Object.fromEntries(
				claudeCodeRules.map((id) => [
					id,
					{
						manifest: createManifest(id, `${id} rules for Claude Code`),
						files: [],
					},
				]),
			),
		};

		if (claudeCodeSkills.length > 0) {
			claudeCodeAgent.skills = claudeCodeSkills.map((name) => createSkill(name));
		}

		agents["claude-code"] = claudeCodeAgent;
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

describe("SelectRulesPageClient - Skills Display (Step 4)", () => {
	it("should display skills section only for Claude Code agent", () => {
		const rulesData = createRulesDataWithSkills(["typescript"], ["typescript"], ["feature-development-workflow"]);

		// Render with cursor - skills should not be visible
		const { unmount } = renderWithProviders(rulesData, "cursor");

		// Skills section should not be visible
		expect(screen.queryByTestId("skills-section")).not.toBeInTheDocument();

		// Render with claude-code - skills should be visible
		unmount();
		renderWithProviders(rulesData, "claude-code");

		// Skills section should be visible
		expect(screen.getByTestId("skills-section")).toBeInTheDocument();
	});

	it("should display all available skills for Claude Code", () => {
		const rulesData = createRulesDataWithSkills(
			[],
			["typescript"],
			["feature-development-workflow", "structured-brainstorming", "test-quality-reviewer"],
		);

		renderWithProviders(rulesData, "claude-code");

		// All 3 skills should be displayed
		expect(screen.getByText("feature-development-workflow")).toBeInTheDocument();
		expect(screen.getByText("structured-brainstorming")).toBeInTheDocument();
		expect(screen.getByText("test-quality-reviewer")).toBeInTheDocument();
	});

	it("should allow selecting skills via checkbox", () => {
		const rulesData = createRulesDataWithSkills([], ["typescript"], ["feature-development-workflow"]);

		renderWithProviders(rulesData, "claude-code");

		// Find the checkbox for the skill
		const checkbox = screen.getByRole("checkbox", { name: /feature-development-workflow/i });

		// Initially should not be checked
		expect(checkbox).not.toBeChecked();

		// Click the checkbox
		fireEvent.click(checkbox);

		// Should now be checked
		expect(checkbox).toBeChecked();
	});

	it("should include selected skills in generated command", () => {
		const rulesData = createRulesDataWithSkills([], ["typescript"], ["feature-development-workflow"]);

		renderWithProviders(rulesData, "claude-code");

		// Select a skill
		const checkbox = screen.getByRole("checkbox", { name: /feature-development-workflow/i });
		fireEvent.click(checkbox);

		// Check that command is generated and includes the skill
		// Find the h3 with "Generated Command" text, then find the pre within that section
		const commandHeading = screen.getByRole("heading", { name: "Generated Command" });
		const commandSection = commandHeading.closest("div");
		const commandPre = commandSection?.querySelector("pre");

		expect(commandPre).toBeInTheDocument();
		expect(commandPre?.textContent).toContain("feature-development-workflow");
		expect(commandPre?.textContent).toContain("--skills");
	});

	it("should display selected skills in sidebar", () => {
		const rulesData = createRulesDataWithSkills(
			[],
			["typescript"],
			["feature-development-workflow", "structured-brainstorming"],
		);

		renderWithProviders(rulesData, "claude-code");

		// Select two skills
		const checkbox1 = screen.getByRole("checkbox", { name: /feature-development-workflow/i });
		fireEvent.click(checkbox1);

		const checkbox2 = screen.getByRole("checkbox", { name: /structured-brainstorming/i });
		fireEvent.click(checkbox2);

		// Find the sidebar section with "Selected Rules" heading
		const sidebarHeading = screen.getByRole("heading", { name: /Selected Rules/i });
		// The sidebar content is in the parent div of the heading
		const sidebarSection = sidebarHeading.parentElement?.parentElement;

		// Check that skills appear within the sidebar section
		expect(sidebarSection?.textContent).toContain("feature-development-workflow");
		expect(sidebarSection?.textContent).toContain("structured-brainstorming");
	});
});
