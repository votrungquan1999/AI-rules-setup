import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SelectRulesPageClient } from "src/app/select-rules/SelectRulesPageClient";
import { ManifestsProvider } from "src/lib/manifests.state";
import { SearchProvider } from "src/lib/search.state";
import { SelectionProvider } from "src/lib/selection.state";
import type { Manifest, RulesData } from "src/server/types";
import { describe, expect, it } from "vitest";

/**
 * Integration tests for Agent-Specific Rule Filtering
 *
 * These tests render the actual component and verify that:
 * - Rules are filtered by selected agent
 * - Switching agents updates displayed rules
 * - Empty state is shown when agent has no rules
 * - Sidebar, commands, and prompts are agent-specific
 * - Search results are filtered by agent
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
 * Helper to create test rules data
 */
function createRulesData(cursorRules: string[], claudeCodeRules: string[]): RulesData {
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

	if (claudeCodeRules.length > 0) {
		agents["claude-code"] = {
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

/**
 * Helper to switch agent via UI and wait for switch to complete
 */
async function switchAgent(agent: string, ruleId: string, ruleDescription: string) {
	const selectTrigger = screen.getByRole("combobox");
	fireEvent.click(selectTrigger);

	await waitFor(() => {
		const option = screen.getByRole("option", { name: agent });
		expect(option).toBeInTheDocument();
	});

	const option = screen.getByRole("option", { name: agent });
	fireEvent.click(option);

	// Wait for agent switch to complete
	await waitFor(() => {
		expect(screen.getByTestId(`rule-card-${ruleId}`)).toBeInTheDocument();
		expect(screen.getByText(ruleDescription)).toBeInTheDocument();
	});
}

/**
 * Helper to select a rule by clicking its checkbox
 */
function selectRule(ruleName: string) {
	const checkbox = screen.getByRole("checkbox", { name: new RegExp(ruleName, "i") });
	fireEvent.click(checkbox);
	return checkbox;
}

/**
 * Helper to get sidebar section
 */
function getSidebarSection() {
	const sidebarHeading = screen.getByRole("heading", { name: /Selected Rules/i });
	return sidebarHeading.parentElement?.parentElement;
}

/**
 * Helper to search for a term
 */
function searchFor(term: string) {
	const searchInput = screen.getByPlaceholderText(/Describe your tech stack/i);
	fireEvent.change(searchInput, { target: { value: term } });
}

describe("SelectRulesPageClient - Agent Filtering", () => {
	it("should display cursor rules when cursor agent is selected", () => {
		const rulesData = createRulesData(["typescript", "react"], ["typescript"]);

		renderWithProviders(rulesData, "cursor");

		// Check that rule cards are displayed using test IDs
		expect(screen.getByTestId("rule-card-typescript")).toBeInTheDocument();
		expect(screen.getByTestId("rule-card-react")).toBeInTheDocument();
		expect(screen.queryByTestId("rule-card-claude-code")).not.toBeInTheDocument();

		// Verify descriptions are correct
		expect(screen.getByText("typescript rules for Cursor")).toBeInTheDocument();
		expect(screen.getByText("react rules for Cursor")).toBeInTheDocument();
		expect(screen.queryByText("typescript rules for Claude Code")).not.toBeInTheDocument();
	});

	it("should display claude-code rules when claude-code agent is selected", () => {
		const rulesData = createRulesData(["typescript"], ["typescript", "react"]);

		renderWithProviders(rulesData, "claude-code");

		// Check that rule cards are displayed using test IDs
		expect(screen.getByTestId("rule-card-typescript")).toBeInTheDocument();
		expect(screen.getByTestId("rule-card-react")).toBeInTheDocument();
		expect(screen.queryByTestId("rule-card-cursor")).not.toBeInTheDocument();

		// Verify descriptions are correct
		expect(screen.getByText("typescript rules for Claude Code")).toBeInTheDocument();
		expect(screen.getByText("react rules for Claude Code")).toBeInTheDocument();
		expect(screen.queryByText("typescript rules for Cursor")).not.toBeInTheDocument();
	});

	it("should show empty state when agent has no rules", () => {
		const rulesData: RulesData = {
			agents: {
				cursor: {
					categories: {},
				},
			},
		};

		renderWithProviders(rulesData, "cursor");

		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
		expect(screen.getByText("No rules available for the selected agent.")).toBeInTheDocument();
	});

	it("should show different rules for cursor vs claude-code", () => {
		const rulesData = createRulesData(["typescript"], ["react"]);

		// Test with cursor selected - render fresh
		const { unmount } = renderWithProviders(rulesData, "cursor");

		// Check cursor-specific content using test IDs
		expect(screen.getByTestId("rule-card-typescript")).toBeInTheDocument();
		expect(screen.queryByTestId("rule-card-react")).not.toBeInTheDocument();
		expect(screen.getByText("typescript rules for Cursor")).toBeInTheDocument();
		expect(screen.queryByText("react rules for Claude Code")).not.toBeInTheDocument();

		// Unmount and render with claude-code
		unmount();

		// Test with claude-code selected - render fresh
		renderWithProviders(rulesData, "claude-code");

		// Check claude-code-specific content using test IDs
		expect(screen.getByTestId("rule-card-react")).toBeInTheDocument();
		expect(screen.queryByTestId("rule-card-typescript")).not.toBeInTheDocument();
		expect(screen.getByText("react rules for Claude Code")).toBeInTheDocument();
		expect(screen.queryByText("typescript rules for Cursor")).not.toBeInTheDocument();
	});
});

describe("SelectRulesPageClient - Agent Switching", () => {
	it("should update rules when agent is switched via UI", async () => {
		const rulesData = createRulesData(["typescript"], ["react"]);
		renderWithProviders(rulesData, "cursor");

		// Verify initial state: cursor's typescript rule is shown
		expect(screen.getByTestId("rule-card-typescript")).toBeInTheDocument();
		expect(screen.getByText("typescript rules for Cursor")).toBeInTheDocument();
		expect(screen.queryByTestId("rule-card-react")).not.toBeInTheDocument();
		expect(screen.queryByText("react rules for Claude Code")).not.toBeInTheDocument();

		// Find the agent selector - verify label exists
		const agentLabel = screen.getByText("AI Agent:");
		expect(agentLabel).toBeInTheDocument();

		// Find the Select trigger button (combobox role)
		const selectTrigger = screen.getByRole("combobox");
		expect(selectTrigger).toBeInTheDocument();

		// Click to open the select dropdown
		fireEvent.click(selectTrigger);

		// Wait for the SelectContent to appear in the portal (Radix Select uses portals)
		// The option should appear with role="option"
		await waitFor(() => {
			const claudeCodeOption = screen.getByRole("option", { name: "claude-code" });
			expect(claudeCodeOption).toBeInTheDocument();
		});

		// Click on the claude-code option
		const claudeCodeOption = screen.getByRole("option", { name: "claude-code" });
		fireEvent.click(claudeCodeOption);

		// Wait for the rules to update after agent change
		await waitFor(() => {
			// Verify claude-code's react rule is now shown
			expect(screen.getByTestId("rule-card-react")).toBeInTheDocument();
			expect(screen.getByText("react rules for Claude Code")).toBeInTheDocument();
		});

		// Verify cursor's typescript rule is no longer shown
		expect(screen.queryByTestId("rule-card-typescript")).not.toBeInTheDocument();
		expect(screen.queryByText("typescript rules for Cursor")).not.toBeInTheDocument();
	});
});

describe("SelectRulesPageClient - Sidebar Agent Filtering", () => {
	it("should clear sidebar selections when switching agents", async () => {
		const rulesData = createRulesData(["typescript"], ["react"]);
		renderWithProviders(rulesData, "cursor");

		// Select a cursor rule
		selectRule("typescript");

		// Verify sidebar shows the selected rule
		const sidebarSection = getSidebarSection();
		expect(sidebarSection?.textContent).toContain("typescript");

		// Switch to claude-code agent
		await switchAgent("claude-code", "react", "react rules for Claude Code");

		// Verify sidebar is cleared (selections should be cleared on agent switch)
		const updatedSidebarSection = getSidebarSection();
		expect(updatedSidebarSection?.textContent).not.toContain("typescript");
		expect(screen.getByText(/No rules selected yet/i)).toBeInTheDocument();
	});

	it("should show only current agent's rules in sidebar after switching and selecting", async () => {
		const rulesData = createRulesData(["typescript"], ["react"]);
		renderWithProviders(rulesData, "cursor");

		// Select cursor's typescript rule
		selectRule("typescript");

		// Verify sidebar shows cursor rule
		const sidebarSection = getSidebarSection();
		expect(sidebarSection?.textContent).toContain("typescript");

		// Switch to claude-code agent
		await switchAgent("claude-code", "react", "react rules for Claude Code");

		// Select claude-code's react rule
		selectRule("react");

		// Verify sidebar shows only claude-code rule, not cursor rule
		await waitFor(() => {
			const updatedSidebarSection = getSidebarSection();
			expect(updatedSidebarSection?.textContent).toContain("react");
			expect(updatedSidebarSection?.textContent).not.toContain("typescript");
		});
	});

	it("should generate agent-specific command", async () => {
		// Create multiple rules to ensure selecting one doesn't mean "all" are selected
		const rulesData = createRulesData(["typescript", "react"], ["react", "tailwind"]);
		renderWithProviders(rulesData, "cursor");

		// Select cursor's typescript rule (not all rules)
		selectRule("typescript");

		// Verify command contains cursor agent and specific category
		const commandHeading = screen.getByRole("heading", { name: "Generated Command" });
		const commandSection = commandHeading.parentElement?.parentElement;
		const commandPre = commandSection?.querySelector("pre");

		expect(commandPre).toBeInTheDocument();
		expect(commandPre?.textContent).toContain("--agent cursor");
		expect(commandPre?.textContent).toContain("typescript");

		// Switch to claude-code agent
		await switchAgent("claude-code", "react", "react rules for Claude Code");

		// Select claude-code's tailwind rule (not all rules)
		selectRule("tailwind");

		// Verify command updates to claude-code agent
		await waitFor(() => {
			const updatedCommandHeading = screen.getByRole("heading", { name: "Generated Command" });
			const updatedCommandSection = updatedCommandHeading.parentElement?.parentElement;
			const updatedCommandPre = updatedCommandSection?.querySelector("pre");
			expect(updatedCommandPre?.textContent).toContain("--agent claude-code");
			expect(updatedCommandPre?.textContent).toContain("tailwind");
			expect(updatedCommandPre?.textContent).not.toContain("cursor");
			expect(updatedCommandPre?.textContent).not.toContain("typescript");
		});
	});

	it("should generate agent-specific prompt", async () => {
		const rulesData = createRulesData(["typescript", "react"], ["react", "tailwind"]);
		renderWithProviders(rulesData, "cursor");

		// Verify prompt contains cursor agent in example command and lists all cursor categories
		const promptHeading = screen.getByRole("heading", { name: "ChatGPT Prompt" });
		const promptSection = promptHeading.parentElement?.parentElement;
		const promptPre = promptSection?.querySelector("pre");

		expect(promptPre).toBeInTheDocument();
		expect(promptPre?.textContent).toContain("--agent cursor");
		expect(promptPre?.textContent).toContain("**react**");
		expect(promptPre?.textContent).toContain("**typescript**");
		expect(promptPre?.textContent).not.toContain("**tailwind**");

		// Switch to claude-code agent
		await switchAgent("claude-code", "react", "react rules for Claude Code");

		// Verify prompt updates to claude-code agent and lists all claude-code categories
		await waitFor(() => {
			const updatedPromptHeading = screen.getByRole("heading", { name: "ChatGPT Prompt" });
			const updatedPromptSection = updatedPromptHeading.parentElement?.parentElement;
			const updatedPromptPre = updatedPromptSection?.querySelector("pre");
			expect(updatedPromptPre?.textContent).toContain("--agent claude-code");
			expect(updatedPromptPre?.textContent).toContain("**react**");
			expect(updatedPromptPre?.textContent).toContain("**tailwind**");
			expect(updatedPromptPre?.textContent).not.toContain("**typescript**");
		});
	});
});

describe("SelectRulesPageClient - Search Agent Filtering", () => {
	it("should filter search results to selected agent", async () => {
		// Create rules with same name in both agents
		const rulesData = createRulesData(["typescript"], ["typescript"]);
		renderWithProviders(rulesData, "cursor");

		// Search for "typescript"
		searchFor("typescript");

		// Wait for search results
		await waitFor(() => {
			expect(screen.getByTestId("rule-card-typescript")).toBeInTheDocument();
		});

		// Verify only cursor's typescript rule appears
		expect(screen.getByText("typescript rules for Cursor")).toBeInTheDocument();
		expect(screen.queryByText("typescript rules for Claude Code")).not.toBeInTheDocument();

		// Switch to claude-code agent
		await switchAgent("claude-code", "typescript", "typescript rules for Claude Code");

		// Verify only claude-code's typescript rule appears
		expect(screen.queryByText("typescript rules for Cursor")).not.toBeInTheDocument();
	});

	it("should handle rule selection and scoring correctly per agent", async () => {
		const rulesData = createRulesData(["typescript"], ["react"]);
		renderWithProviders(rulesData, "cursor");

		// Get checkbox before selecting
		const typescriptCheckbox = screen.getByRole("checkbox", { name: /typescript/i });
		expect(typescriptCheckbox).not.toBeChecked();

		// Select cursor's typescript rule
		selectRule("typescript");

		// Verify rule is selected
		await waitFor(() => {
			expect(typescriptCheckbox).toBeChecked();
		});

		// Verify sidebar shows the selected rule
		const sidebarSection = getSidebarSection();
		expect(sidebarSection?.textContent).toContain("typescript");

		// Switch to claude-code agent
		await switchAgent("claude-code", "react", "react rules for Claude Code");

		// Verify cursor selection is cleared (sidebar should be empty)
		const updatedSidebarSection = getSidebarSection();
		expect(updatedSidebarSection?.textContent).not.toContain("typescript");
		expect(screen.getByText(/No rules selected yet/i)).toBeInTheDocument();

		// Get checkbox before selecting
		const reactCheckbox = screen.getByRole("checkbox", { name: /react/i });
		expect(reactCheckbox).not.toBeChecked();

		// Select claude-code's react rule
		selectRule("react");

		// Verify rule is selected
		await waitFor(() => {
			expect(reactCheckbox).toBeChecked();
		});

		// Verify sidebar shows claude-code rule
		const finalSidebarSection = getSidebarSection();
		expect(finalSidebarSection?.textContent).toContain("react");
		expect(finalSidebarSection?.textContent).not.toContain("typescript");
	});

	it("should show all rules for current agent when no search query", async () => {
		const rulesData = createRulesData(["typescript", "react"], ["react", "tailwind"]);
		renderWithProviders(rulesData, "cursor");

		// Verify all cursor rules appear (no search query)
		expect(screen.getByTestId("rule-card-typescript")).toBeInTheDocument();
		expect(screen.getByTestId("rule-card-react")).toBeInTheDocument();
		expect(screen.getByText("typescript rules for Cursor")).toBeInTheDocument();
		expect(screen.getByText("react rules for Cursor")).toBeInTheDocument();

		// Verify claude-code rules are not visible
		expect(screen.queryByText("tailwind rules for Claude Code")).not.toBeInTheDocument();

		// Switch to claude-code agent
		await switchAgent("claude-code", "react", "react rules for Claude Code");

		// Verify all claude-code rules appear
		expect(screen.getByText("react rules for Claude Code")).toBeInTheDocument();
		expect(screen.getByText("tailwind rules for Claude Code")).toBeInTheDocument();

		// Verify cursor-only rules are not visible
		expect(screen.queryByText("typescript rules for Cursor")).not.toBeInTheDocument();
	});
});
