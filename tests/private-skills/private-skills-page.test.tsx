import { fireEvent, render, screen } from "@testing-library/react";
import { PrivateSkillsPageClient } from "src/app/private-skills/PrivateSkillsPageClient";
import { PrivateSkillsProvider } from "src/app/private-skills/private-skills-page.state";
import type { PrivateSkillDisplay } from "src/app/private-skills/private-skills-page.type";
import { describe, expect, it } from "vitest";

/**
 * Component test for the reviewer private-skills browse page (jsdom). Asserts the list shows each
 * skill's name, agent, scopes, and description so the reviewer understands its visibility.
 */
function renderPage(skills: PrivateSkillDisplay[]) {
	return render(
		<PrivateSkillsProvider skills={skills}>
			<PrivateSkillsPageClient />
		</PrivateSkillsProvider>,
	);
}

describe("Private Skills browse page", () => {
	it("renders each skill's name, agent, scopes, and description", () => {
		renderPage([
			{ name: "deploy-helper", agent: "claude-code", scopes: ["work", "client-x"], description: "Helps deploy" },
		]);

		expect(screen.getByText("deploy-helper")).toBeInTheDocument();
		expect(screen.getByText("claude-code")).toBeInTheDocument();
		expect(screen.getByText("Helps deploy")).toBeInTheDocument();
		expect(screen.getByText("work")).toBeInTheDocument();
		expect(screen.getByText("client-x")).toBeInTheDocument();
	});

	it("marks a global skill with a 'Global' badge while a scoped skill shows its scope", () => {
		renderPage([
			{ name: "global-skill", agent: "claude-code", scopes: [], description: "Everyone" },
			{ name: "scoped-skill", agent: "cursor", scopes: ["work"], description: "Team only" },
		]);

		// The global skill carries a single "Global" badge.
		expect(screen.getAllByText("Global")).toHaveLength(1);
		// The scoped skill still shows its scope chip.
		expect(screen.getByText("work")).toBeInTheDocument();
	});

	it("narrows the list to global skills only when filtered, and restores all when toggled off", () => {
		renderPage([
			{ name: "global-skill", agent: "claude-code", scopes: [], description: "Everyone" },
			{ name: "scoped-skill", agent: "cursor", scopes: ["work"], description: "Team only" },
		]);

		// Both skills are visible initially.
		expect(screen.getByText("global-skill")).toBeInTheDocument();
		expect(screen.getByText("scoped-skill")).toBeInTheDocument();

		// When the reviewer turns on the global-only filter, the scoped skill disappears.
		fireEvent.click(screen.getByRole("button", { name: /global only/i }));
		expect(screen.getByText("global-skill")).toBeInTheDocument();
		expect(screen.queryByText("scoped-skill")).not.toBeInTheDocument();

		// When toggled off again, both skills are visible.
		fireEvent.click(screen.getByRole("button", { name: /show all/i }));
		expect(screen.getByText("scoped-skill")).toBeInTheDocument();
	});
});
