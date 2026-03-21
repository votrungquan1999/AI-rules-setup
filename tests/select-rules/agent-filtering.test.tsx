import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { RulesData } from "src/server/types";
import { describe, expect, it } from "vitest";
import { createManifest, renderSelectRulesPage } from "../helpers/select-rules-utils";

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
	const sidebarHeading = screen.getByRole("heading", { name: /Selected Items/i });
	return sidebarHeading.parentElement?.parentElement;
}

describe("SelectRulesPageClient - Agent Filtering", () => {
	it("should display cursor rules when cursor agent is selected", () => {
		const rulesData = createRulesData(["typescript", "react"], ["typescript"]);

		renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

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

		renderSelectRulesPage(rulesData, { defaultAgent: "claude-code" });

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

		renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
		expect(screen.getByText("No rules available for the selected agent.")).toBeInTheDocument();
	});

	it("should show different rules for cursor vs claude-code", () => {
		const rulesData = createRulesData(["typescript"], ["react"]);

		// Test with cursor selected - render fresh
		const { unmount } = renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

		// Check cursor-specific content using test IDs
		expect(screen.getByTestId("rule-card-typescript")).toBeInTheDocument();
		expect(screen.queryByTestId("rule-card-react")).not.toBeInTheDocument();
		expect(screen.getByText("typescript rules for Cursor")).toBeInTheDocument();
		expect(screen.queryByText("react rules for Claude Code")).not.toBeInTheDocument();

		// Unmount and render with claude-code
		unmount();

		// Test with claude-code selected - render fresh
		renderSelectRulesPage(rulesData, { defaultAgent: "claude-code" });

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
		renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

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
		renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

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
		expect(screen.getByText(/No items selected yet/i)).toBeInTheDocument();
	});

	it("should show only current agent's rules in sidebar after switching and selecting", async () => {
		const rulesData = createRulesData(["typescript"], ["react"]);
		renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

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
		renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

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
		renderSelectRulesPage(rulesData, { defaultAgent: "cursor" });

		// Mock clipboard API
		let clipboardValue = "";
		Object.assign(navigator, {
			clipboard: {
				writeText: async (text: string) => {
					clipboardValue = text;
				},
			},
		});

		// Click the copy prompt button
		const banner = screen.getByTestId("getting-started-banner");
		const copyButton = banner.querySelector("button[aria-label='Copy prompt']");
		expect(copyButton).toBeInTheDocument();
		// biome-ignore lint/style/noNonNullAssertion: this is test files, acceptable
		fireEvent.click(copyButton!);

		// Verify clipboard received agent-specific prompt
		await waitFor(() => {
			expect(clipboardValue).toContain("--agent cursor");
			expect(clipboardValue).toContain("**typescript**");
			expect(clipboardValue).toContain("**react**");
			expect(clipboardValue).not.toContain("**tailwind**");
		});
	});
});
