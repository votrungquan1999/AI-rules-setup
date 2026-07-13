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

	it("clears the description on the card when the reviewer empties the field and saves", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderPage([
			{
				id: "skill-1",
				name: "deploy-helper",
				agent: "claude-code",
				content: "body",
				scopes: ["work"],
				description: "old desc",
			},
		]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));
		const dialog = screen.getByRole("dialog");

		fireEvent.change(within(dialog).getByLabelText("Description"), { target: { value: "" } });
		fireEvent.click(screen.getByRole("button", { name: /save/i }));

		// The PATCH carries an empty description string, which clears it under the partial-patch contract.
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/skills/skill-1",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ name: "deploy-helper", content: "body", description: "", scopes: ["work"] }),
				}),
			),
		);

		// And the card no longer shows a description — no reload needed.
		await waitFor(() => expect(screen.queryByText("old desc")).not.toBeInTheDocument());
	});

	it("clears the description when the reviewer enters a whitespace-only value and saves (D8 R18, trim-to-clear)", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderPage([
			{
				id: "skill-1",
				name: "deploy-helper",
				agent: "claude-code",
				content: "body",
				scopes: ["work"],
				description: "old desc",
			},
		]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));
		const dialog = screen.getByRole("dialog");

		fireEvent.change(within(dialog).getByLabelText("Description"), { target: { value: "   " } });
		fireEvent.click(screen.getByRole("button", { name: /save/i }));

		// The PATCH carries a trimmed-to-empty description, not the literal spaces.
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/skills/skill-1",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ name: "deploy-helper", content: "body", description: "", scopes: ["work"] }),
				}),
			),
		);

		// And the card no longer shows the old description — no reload needed.
		await waitFor(() => expect(screen.queryByText("old desc")).not.toBeInTheDocument());
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

	it("opens a confirm dialog when the reviewer clicks Delete", () => {
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

		fireEvent.click(screen.getByRole("button", { name: /delete/i }));

		expect(screen.getByRole("dialog", { name: /delete this skill/i })).toBeInTheDocument();
	});

	it("deletes the skill and removes its card when the reviewer confirms", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

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

		fireEvent.click(screen.getByRole("button", { name: /delete/i }));
		const dialog = screen.getByRole("dialog", { name: /delete this skill/i });
		fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

		// The confirm calls DELETE on the skill's own URL.
		await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/skills/skill-1", { method: "DELETE" }));

		// And the card is gone — no reload needed.
		await waitFor(() => expect(screen.queryByText("deploy-helper")).not.toBeInTheDocument());
	});

	it("removes the card when the DELETE responds 404, since the skill is already gone (D9 R19)", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response);
		vi.stubGlobal("fetch", fetchMock);

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

		fireEvent.click(screen.getByRole("button", { name: /delete/i }));
		const dialog = screen.getByRole("dialog", { name: /delete this skill/i });
		fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

		// A 404 means the skill is already gone — the reviewer's intent is satisfied, so the card still drops.
		await waitFor(() => expect(screen.queryByText("deploy-helper")).not.toBeInTheDocument());
	});

	it("keeps the card and sends no request when the reviewer cancels the delete", () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

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

		fireEvent.click(screen.getByRole("button", { name: /delete/i }));
		const dialog = screen.getByRole("dialog", { name: /delete this skill/i });
		fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

		// The dialog closes, the card stays, and no request was ever sent.
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByText("deploy-helper")).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
