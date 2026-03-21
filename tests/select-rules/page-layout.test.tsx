import { fireEvent, render, screen } from "@testing-library/react";
import { SelectRulesPageClient } from "src/app/select-rules/SelectRulesPageClient";
import { ManifestsProvider } from "src/lib/manifests.state";
import { SearchProvider } from "src/lib/search.state";
import { SelectionProvider } from "src/lib/selection.state";
import type { Manifest, Preset, RulesData, SkillFile, WorkflowFile } from "src/server/types";
import { describe, expect, it } from "vitest";

/**
 * Integration tests for the page layout behavior.
 * Tests agent landing flow, content display order, presets, and page structure.
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

function createSkill(name: string): SkillFile {
	return {
		name,
		content: `---\ndescription: ${name} skill\n---\n# ${name}`,
	};
}

function createWorkflow(name: string): WorkflowFile {
	return {
		name,
		content: `---\ndescription: ${name}\n---\n# ${name} workflow`,
	};
}

function createMultiAgentRulesData(): RulesData {
	return {
		agents: {
			antigravity: {
				categories: {
					meta: { manifest: createManifest("meta", "Meta rules"), files: [] },
				},
				skills: [createSkill("tdd-design")],
				workflows: [createWorkflow("feature-development")],
			},
			"claude-code": {
				categories: {
					meta: { manifest: createManifest("meta", "Meta rules for Claude Code"), files: [] },
				},
				skills: [createSkill("tdd-design"), createSkill("bdd-design")],
			},
			cursor: {
				categories: {
					meta: { manifest: createManifest("meta", "Meta rules for Cursor"), files: [] },
				},
			},
		},
	};
}

function createTestPresets(): Record<string, Preset[]> {
	return {
		antigravity: [
			{
				id: "nextjs-fullstack",
				name: "Next.js Fullstack",
				icon: "▲",
				description: "Full-stack Next.js app",
				skills: ["tdd-design"],
				workflows: ["feature-development"],
				rules: ["meta"],
			},
			{
				id: "react-client",
				name: "React Client",
				icon: "⚛️",
				description: "Client-side React app",
				skills: ["tdd-design"],
				workflows: [],
				rules: ["meta"],
			},
		],
	};
}

interface RenderOptions {
	defaultAgent?: string;
	presets?: Record<string, Preset[]>;
}

function renderWithProviders(rulesData: RulesData, options: RenderOptions = {}) {
	const agents = Object.keys(rulesData.agents);
	const { defaultAgent, presets } = options;
	return render(
		<SelectionProvider {...(defaultAgent ? { defaultAgent } : {})}>
			<ManifestsProvider rulesData={rulesData} questions={[]} agents={agents} {...(presets ? { presets } : {})}>
				<SearchProvider>
					<SelectRulesPageClient />
				</SearchProvider>
			</ManifestsProvider>
		</SelectionProvider>,
	);
}

describe("Page Layout", () => {
	it("should display 'AI Agent Setup' as the page title", () => {
		const rulesData = createMultiAgentRulesData();
		renderWithProviders(rulesData, { defaultAgent: "antigravity" });

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading.textContent).toBe("AI Agent Setup");
	});

	it("should display Skills and Rules tabs for Claude Code, but no Workflows", () => {
		const rulesData = createMultiAgentRulesData();
		renderWithProviders(rulesData, { defaultAgent: "claude-code" });

		expect(screen.getByRole("tab", { name: /skills/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /rules/i })).toBeInTheDocument();
		expect(screen.queryByRole("tab", { name: /workflows/i })).not.toBeInTheDocument();
	});

	it("should show agent selection cards on first page load", () => {
		const rulesData = createMultiAgentRulesData();
		renderWithProviders(rulesData);

		// Landing page should show agent cards, not content
		expect(screen.getByTestId("agent-landing")).toBeInTheDocument();
		expect(screen.getByTestId("agent-card-antigravity")).toBeInTheDocument();
		expect(screen.getByTestId("agent-card-claude-code")).toBeInTheDocument();
		expect(screen.getByTestId("agent-card-cursor")).toBeInTheDocument();
		expect(screen.queryByTestId("content-area")).not.toBeInTheDocument();
	});

	it("should transition from landing to content view when agent card is clicked", () => {
		const rulesData = createMultiAgentRulesData();
		renderWithProviders(rulesData);

		// Initially shows landing, not content
		expect(screen.getByTestId("agent-landing")).toBeInTheDocument();
		expect(screen.queryByTestId("content-area")).not.toBeInTheDocument();

		// Click an agent card
		fireEvent.click(screen.getByTestId("agent-card-antigravity"));

		// Should now show content, not landing
		expect(screen.queryByTestId("agent-landing")).not.toBeInTheDocument();
		expect(screen.getByTestId("content-area")).toBeInTheDocument();
	});

	it("should show preset cards in the content view when presets are available", () => {
		const rulesData = createMultiAgentRulesData();
		const presets = createTestPresets();
		renderWithProviders(rulesData, { defaultAgent: "antigravity", presets });

		// Preset cards should render for the selected agent
		expect(screen.getByTestId("preset-cards")).toBeInTheDocument();
		expect(screen.getByTestId("preset-card-nextjs-fullstack")).toBeInTheDocument();
		expect(screen.getByTestId("preset-card-react-client")).toBeInTheDocument();
	});

	it("should auto-select rules, skills, and workflows when a preset card is clicked", () => {
		const rulesData = createMultiAgentRulesData();
		const presets = createTestPresets();
		renderWithProviders(rulesData, { defaultAgent: "antigravity", presets });

		// Click the "Next.js Fullstack" preset
		fireEvent.click(screen.getByTestId("preset-card-nextjs-fullstack"));

		// Check skills (default active tab)
		const skillCheckbox = screen.getByRole("checkbox", { name: /tdd-design/i });
		expect(skillCheckbox).toBeChecked();

		// Check workflows
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));
		const workflowCheckbox = screen.getByRole("checkbox", { name: /feature-development/i });
		expect(workflowCheckbox).toBeChecked();

		// Check rules
		fireEvent.mouseDown(screen.getByRole("tab", { name: /rules/i }));
		const ruleCheckbox = screen.getByRole("checkbox", { name: /meta/i });
		expect(ruleCheckbox).toBeChecked();
	});

	it("should render a getting-started banner in the content view", () => {
		const rulesData = createMultiAgentRulesData();
		renderWithProviders(rulesData, { defaultAgent: "antigravity" });

		// The getting-started banner should appear in the content view
		const banner = screen.getByTestId("getting-started-banner");
		expect(banner).toBeInTheDocument();

		// It should contain a CTA heading and a copy prompt button
		expect(screen.getByText(/not sure what to pick/i)).toBeInTheDocument();
		const copyButton = banner.querySelector("button[aria-label='Copy prompt']");
		expect(copyButton).toBeInTheDocument();
	});

	it("should render content in a tabbed layout with correct tabs", () => {
		const rulesData = createMultiAgentRulesData();
		renderWithProviders(rulesData, { defaultAgent: "antigravity" });

		// Tabs container should be present
		const tabsList = screen.getByTestId("content-tabs");
		expect(tabsList).toBeInTheDocument();

		// Antigravity has skills, workflows, and rules — all 3 tabs should render
		expect(screen.getByRole("tab", { name: /skills/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /workflows/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /rules/i })).toBeInTheDocument();
	});

	it("should show selection counts in tab labels", () => {
		const rulesData = createMultiAgentRulesData();
		renderWithProviders(rulesData, { defaultAgent: "antigravity" });

		// Click the Workflows tab
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));

		// Select a workflow
		fireEvent.click(screen.getByRole("checkbox", { name: /feature-development/i }));

		// The Workflows tab should now display a "(1)" count badge
		const workflowsTab = screen.getByRole("tab", { name: /workflows/i });
		expect(workflowsTab.textContent).toContain("Workflows");
		expect(workflowsTab.textContent).toContain("(1)");

		// Skills tab is initially 0
		const skillsTab = screen.getByRole("tab", { name: /skills/i });
		expect(skillsTab.textContent).toContain("(0)");
	});

	it("should display selected items in the sidebar grouped by type with sub-headings and section-level clear buttons", () => {
		const rulesData = createMultiAgentRulesData();
		renderWithProviders(rulesData, { defaultAgent: "antigravity" });

		// Select a skill
		fireEvent.click(screen.getByRole("checkbox", { name: /tdd-design/i }));

		// Select a workflow
		fireEvent.mouseDown(screen.getByRole("tab", { name: /workflows/i }));
		fireEvent.click(screen.getByRole("checkbox", { name: /feature-development/i }));

		// Select a rule
		fireEvent.mouseDown(screen.getByRole("tab", { name: /rules/i }));
		fireEvent.click(screen.getByRole("checkbox", { name: /meta/i }));

		// Find the sidebar container by its main heading
		const sidebarHeading = screen.getByRole("heading", { name: /Selected Items/i });
		const sidebar = sidebarHeading.closest("div")?.parentElement;
		if (!sidebar) throw new Error("Sidebar not found");

		// Verify side-bar sub-headings
		const {
			getByRole: getByRoleInSidebar,
			getByText: getByTextInSidebar,
			queryByText: queryByTextInSidebar,
		} = require("@testing-library/react").within(sidebar);
		expect(getByRoleInSidebar("heading", { name: "Skills" })).toBeInTheDocument();
		expect(getByRoleInSidebar("heading", { name: "Workflows" })).toBeInTheDocument();
		expect(getByRoleInSidebar("heading", { name: "Rules" })).toBeInTheDocument();

		// Verify section-level clear buttons
		const clearSkillsBtn = getByRoleInSidebar("button", { name: /clear skills/i });
		expect(clearSkillsBtn).toBeInTheDocument();

		const clearWorkflowsBtn = getByRoleInSidebar("button", { name: /clear workflows/i });
		expect(clearWorkflowsBtn).toBeInTheDocument();

		const clearRulesBtn = getByRoleInSidebar("button", { name: /clear rules/i });
		expect(clearRulesBtn).toBeInTheDocument();

		// Ensure clicking clear skills only clears skills
		fireEvent.click(clearSkillsBtn);
		expect(queryByTextInSidebar(/tdd-design/i)).not.toBeInTheDocument();
		// Workflows and Rules should still be there
		expect(getByTextInSidebar(/feature-development/i)).toBeInTheDocument();
		expect(getByTextInSidebar(/meta/i)).toBeInTheDocument();
	});
});
