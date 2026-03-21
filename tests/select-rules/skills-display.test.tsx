import { fireEvent, screen } from "@testing-library/react";
import type { RulesData } from "src/server/types";
import { describe, expect, it } from "vitest";
import { createManifest, createSkill, renderSelectRulesPage } from "../helpers/select-rules-utils";

/**
 * Integration tests for the Skills Display section.
 * Skills section should appear when the selected agent has skills data,
 * regardless of which agent it is.
 *
 * Note: Uses real agent names because SelectRulesPageClient routes to
 * agent-specific display components that conditionally render SkillsList.
 */

function createRulesDataWithSkills(agentWithSkills: string, skillNames: string[]): RulesData {
	return {
		agents: {
			[agentWithSkills]: {
				categories: {
					meta: { manifest: createManifest("meta", "Meta rules"), files: [] },
				},
				skills: skillNames.map((name) => createSkill(name)),
			},
			cursor: {
				categories: {
					meta: { manifest: createManifest("meta", "Meta rules"), files: [] },
				},
				// No skills — cursor agent has no skills in this test data
			},
		},
	};
}

describe("Skills Display", () => {
	it("should display skills section when the agent has skills", () => {
		const rulesData = createRulesDataWithSkills("antigravity", ["tdd-design", "bdd-design"]);

		// Render with an agent that has skills data
		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Skills section should be visible because the agent has skills
		expect(screen.getByTestId("skills-section")).toBeInTheDocument();
	});

	it("should NOT display skills section when the agent has no skills", () => {
		const rulesData = createRulesDataWithSkills("antigravity", ["tdd-design"]);

		// Render with an agent that has NO skills data
		renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

		// Skills section should not be visible
		expect(screen.queryByTestId("skills-section")).not.toBeInTheDocument();
	});

	it("should display all available skills for the selected agent", () => {
		const rulesData = createRulesDataWithSkills("antigravity", [
			"feature-development",
			"structured-brainstorming",
			"test-quality-reviewer",
		]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// All 3 skills should be visible
		expect(screen.getByText("feature-development")).toBeInTheDocument();
		expect(screen.getByText("structured-brainstorming")).toBeInTheDocument();
		expect(screen.getByText("test-quality-reviewer")).toBeInTheDocument();
	});

	it("should allow selecting skills via checkbox", () => {
		const rulesData = createRulesDataWithSkills("antigravity", ["tdd-design"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Find the checkbox for the skill
		const checkbox = screen.getByRole("checkbox", { name: /tdd-design/i });

		// Initially unchecked
		expect(checkbox).not.toBeChecked();

		// Click to select
		fireEvent.click(checkbox);

		// Now checked
		expect(checkbox).toBeChecked();
	});

	it("should include selected skills in generated command", () => {
		const rulesData = createRulesDataWithSkills("antigravity", ["tdd-design"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Select the skill
		const checkbox = screen.getByRole("checkbox", { name: /tdd-design/i });
		fireEvent.click(checkbox);

		// Verify the generated command includes the skill
		const commandHeading = screen.getByRole("heading", { name: "Generated Command" });
		const commandSection = commandHeading.closest("div");
		const commandPre = commandSection?.querySelector("pre");

		expect(commandPre).toBeInTheDocument();
		expect(commandPre?.textContent).toContain("--skills all");
	});

	it("should select and deselect all skills via master checkbox", () => {
		const rulesData = createRulesDataWithSkills("antigravity", [
			"feature-development",
			"structured-brainstorming",
			"test-quality-reviewer",
		]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Master checkbox should exist
		const masterCheckbox = screen.getByRole("checkbox", { name: /select all skills/i });
		expect(masterCheckbox).not.toBeChecked();

		// All individual checkboxes should be unchecked initially
		const individualCheckboxes = screen.getAllByRole("checkbox").filter((cb) => cb !== masterCheckbox);
		expect(individualCheckboxes).toHaveLength(3);
		individualCheckboxes.forEach((cb) => {
			expect(cb).not.toBeChecked();
		});

		// Click master checkbox to Select All
		fireEvent.click(masterCheckbox);

		// Now master and all individuals should be checked
		expect(masterCheckbox).toBeChecked();
		individualCheckboxes.forEach((cb) => {
			expect(cb).toBeChecked();
		});

		// Click master checkbox again to Deselect All
		fireEvent.click(masterCheckbox);

		// Now all should be unchecked again
		expect(masterCheckbox).not.toBeChecked();
		individualCheckboxes.forEach((cb) => {
			expect(cb).not.toBeChecked();
		});
	});

	it("should display the description of the skill if available", () => {
		const rulesData = createRulesDataWithSkills("antigravity", ["tdd-design"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Verify the description is rendered
		expect(screen.getByText("tdd-design skill description")).toBeInTheDocument();
	});
});
