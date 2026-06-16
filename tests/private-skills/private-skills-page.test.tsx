import { render, screen } from "@testing-library/react";
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
});
