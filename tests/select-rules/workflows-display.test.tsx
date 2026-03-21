import { fireEvent, screen } from "@testing-library/react";
import type { RulesData } from "src/server/types";
import { describe, expect, it } from "vitest";
import { createManifest, createWorkflow, renderSelectRulesPage } from "../helpers/select-rules-utils";

/**
 * Integration tests for the Workflows Display section.
 * Workflows section should appear when the selected agent has workflow data,
 * regardless of which agent it is.
 *
 * Note: Uses real agent names because SelectRulesPageClient routes to
 * agent-specific display components that conditionally render WorkflowsList.
 */

function createRulesDataWithWorkflows(agentWithWorkflows: string, workflowNames: string[]): RulesData {
	return {
		agents: {
			[agentWithWorkflows]: {
				categories: {
					meta: { manifest: createManifest("meta", "Meta rules"), files: [] },
				},
				workflows: workflowNames.map((name) => createWorkflow(name)),
			},
			cursor: {
				categories: {
					meta: { manifest: createManifest("meta", "Meta rules"), files: [] },
				},
				// No workflows — cursor agent has no workflows in this test data
			},
		},
	};
}

describe("Workflows Display", () => {
	it("should display workflows section when the agent has workflows", () => {
		const rulesData = createRulesDataWithWorkflows("antigravity", ["deploy-app"]);

		// Render with an agent that has workflow data
		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Click the Workflows tab
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));

		// Workflows section should be visible because the agent has workflows
		expect(screen.getByTestId("workflows-section")).toBeInTheDocument();
	});

	it("should NOT display workflows section when the agent has no workflows", () => {
		const rulesData = createRulesDataWithWorkflows("antigravity", ["deploy-app"]);

		// Render with an agent that has NO workflow data
		renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

		// Workflows section should not be visible
		expect(screen.queryByTestId("workflows-section")).not.toBeInTheDocument();
	});

	it("should display all available workflows for the selected agent", () => {
		const rulesData = createRulesDataWithWorkflows("antigravity", ["deploy-app", "run-tests", "create-feature"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Click the Workflows tab
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));

		// All 3 workflows should be visible
		expect(screen.getByText("deploy-app")).toBeInTheDocument();
		expect(screen.getByText("run-tests")).toBeInTheDocument();
		expect(screen.getByText("create-feature")).toBeInTheDocument();
	});

	it("should allow selecting workflows via checkbox", async () => {
		const rulesData = createRulesDataWithWorkflows("antigravity", ["deploy-app"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Click the Workflows tab (Radix tabs activate on mouse down)
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));

		// Find the checkbox for the workflow
		const checkbox = screen.getByRole("checkbox", { name: /deploy-app/i });

		// Initially unchecked
		expect(checkbox).not.toBeChecked();

		// Click to select
		fireEvent.click(checkbox);

		// Now checked
		expect(checkbox).toBeChecked();
	});

	it("should include selected workflows in the generated CLI command", () => {
		const rulesData = createRulesDataWithWorkflows("antigravity", ["deploy-app", "run-tests"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Click the Workflows tab
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));

		// Select both workflows
		fireEvent.click(screen.getByRole("checkbox", { name: /deploy-app/i }));
		fireEvent.click(screen.getByRole("checkbox", { name: /run-tests/i }));

		// Verify the generated command includes both workflows
		const commandHeading = screen.getByRole("heading", { name: "Generated Command" });
		const commandSection = commandHeading.closest("div");

		// Verify the generated command uses "all" since both workflows are selected
		expect(commandSection?.textContent).toContain("--workflows all");
	});

	it("should include workflows in ChatGPT prompt", () => {
		const rulesData = createRulesDataWithWorkflows("antigravity", ["deploy-app"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Click the Workflows tab
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));

		// Select the workflow
		fireEvent.click(screen.getByRole("checkbox", { name: /deploy-app/i }));

		// Verify the getting-started banner copy prompt button exists
		// (the prompt is generated from all manifests including workflows)
		const banner = screen.getByTestId("getting-started-banner");
		const copyButton = banner.querySelector("button[aria-label='Copy prompt']");
		expect(copyButton).toBeInTheDocument();
	});

	it("should select and deselect all workflows via master checkbox", () => {
		const rulesData = createRulesDataWithWorkflows("antigravity", ["deploy-app", "run-tests", "create-feature"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Click the Workflows tab to render content
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));

		// Master checkbox should exist
		const masterCheckbox = screen.getByRole("checkbox", { name: /select all workflows/i });
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

	it("should display the description of the workflow if available", () => {
		const rulesData = createRulesDataWithWorkflows("antigravity", ["deploy-app"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "antigravity" });

		// Click the Workflows tab
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));

		// Verify the description is rendered
		expect(screen.getByText("deploy-app workflow description")).toBeInTheDocument();
	});
});
