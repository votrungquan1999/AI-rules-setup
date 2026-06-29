import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PrivateSkillsPageClient } from "src/app/private-skills/PrivateSkillsPageClient";
import { PrivateSkillsProvider } from "src/app/private-skills/private-skills-page.state";
import type { PrivateSkillDisplay } from "src/app/private-skills/private-skills-page.type";
import { afterEach, describe, expect, it, vi } from "vitest";

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
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders each skill's name, agent, scopes, and description", () => {
		renderPage([
			{
				id: "skill-1",
				name: "deploy-helper",
				agent: "claude-code",
				content: "deploy body",
				scopes: ["work", "client-x"],
				description: "Helps deploy",
			},
		]);

		expect(screen.getByText("deploy-helper")).toBeInTheDocument();
		expect(screen.getByText("claude-code")).toBeInTheDocument();
		expect(screen.getByText("Helps deploy")).toBeInTheDocument();
		expect(screen.getByText("work")).toBeInTheDocument();
		expect(screen.getByText("client-x")).toBeInTheDocument();
	});

	it("disables Save while the edit is saving, then closes the dialog when it succeeds", async () => {
		// Given a save request that stays pending until we resolve it
		let resolveSave: (response: Response) => void = () => {};
		const fetchMock = vi.fn(
			() =>
				new Promise<Response>((res) => {
					resolveSave = res;
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		renderPage([
			{ id: "skill-1", name: "deploy-helper", agent: "claude-code", content: "deploy body", scopes: ["work"] },
		]);
		fireEvent.click(screen.getByRole("button", { name: /edit/i }));

		// When the reviewer saves (request in flight)
		fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /save/i }));

		// Then Save is disabled while pending
		await waitFor(() =>
			expect(within(screen.getByRole("dialog")).getByRole("button", { name: /save/i })).toBeDisabled(),
		);

		// When the save succeeds, the dialog closes
		resolveSave({ ok: true } as Response);
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
	});

	it("opens an editor pre-filled with the skill's title, content, description, and scopes", () => {
		renderPage([
			{
				id: "skill-1",
				name: "deploy-helper",
				agent: "claude-code",
				content: "deploy body",
				scopes: ["work"],
				description: "Helps deploy",
			},
		]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));

		const dialog = screen.getByRole("dialog");
		expect(within(dialog).getByLabelText("Title")).toHaveValue("deploy-helper");
		expect(within(dialog).getByLabelText("Content")).toHaveValue("deploy body");
		expect(within(dialog).getByLabelText("Description")).toHaveValue("Helps deploy");
		expect(within(dialog).getByText("work")).toBeInTheDocument();
	});

	it("reflects a skill's new title, description, and scopes on the card immediately after saving", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderPage([
			{
				id: "skill-1",
				name: "old-name",
				agent: "claude-code",
				content: "body",
				scopes: ["work"],
				description: "old desc",
			},
		]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));
		const dialog = screen.getByRole("dialog");

		fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "new-name" } });
		fireEvent.change(within(dialog).getByLabelText("Description"), { target: { value: "new desc" } });
		const scopeInput = within(dialog).getByLabelText("Scopes");
		fireEvent.change(scopeInput, { target: { value: "client-x" } });
		fireEvent.keyDown(scopeInput, { key: "Enter" });
		fireEvent.click(within(dialog).getByRole("button", { name: "Remove work" }));

		fireEvent.click(screen.getByRole("button", { name: /save/i }));

		// The PATCH carries the edited fields with normalized scopes, addressed by id.
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/skills/skill-1",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ name: "new-name", content: "body", description: "new desc", scopes: ["client-x"] }),
				}),
			),
		);

		// And the card reflects the new title, description, and scope immediately — no reload.
		await waitFor(() => expect(screen.getByText("new-name")).toBeInTheDocument());
		expect(screen.getByText("new desc")).toBeInTheDocument();
		expect(screen.getByText("client-x")).toBeInTheDocument();
		expect(screen.queryByText("old-name")).not.toBeInTheDocument();
	});

	it("marks a global skill with a 'Global' badge while a scoped skill shows its scope", () => {
		renderPage([
			{
				id: "skill-global",
				name: "global-skill",
				agent: "claude-code",
				content: "g",
				scopes: [],
				description: "Everyone",
			},
			{
				id: "skill-scoped",
				name: "scoped-skill",
				agent: "cursor",
				content: "s",
				scopes: ["work"],
				description: "Team only",
			},
		]);

		// The global skill carries a single "Global" badge.
		expect(screen.getAllByText("Global")).toHaveLength(1);
		// The scoped skill still shows its scope chip.
		expect(screen.getByText("work")).toBeInTheDocument();
	});

	it("narrows the list to global skills only when filtered, and restores all when toggled off", () => {
		renderPage([
			{
				id: "skill-global",
				name: "global-skill",
				agent: "claude-code",
				content: "g",
				scopes: [],
				description: "Everyone",
			},
			{
				id: "skill-scoped",
				name: "scoped-skill",
				agent: "cursor",
				content: "s",
				scopes: ["work"],
				description: "Team only",
			},
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
