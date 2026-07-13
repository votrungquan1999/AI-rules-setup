import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { KbPageClient } from "src/app/kb/KbPageClient";
import { KbBrowseProvider } from "src/app/kb/kb-browse.state";
import { type KbDoc, KbStatus, KbType } from "src/server/types";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Component tests for the canonical KB browse screen (jsdom). A reviewer can edit an approved entry's
 * title/body/scope from this page; the entry stays canonical and the card reflects changes at once.
 */
function renderBrowse(entries: KbDoc[]) {
	return render(
		<KbBrowseProvider entries={entries}>
			<KbPageClient />
		</KbBrowseProvider>,
	);
}

function canonicalEntry(overrides: Partial<KbDoc> = {}): KbDoc {
	return {
		id: "507f1f77bcf86cd799439011",
		type: KbType.Question,
		status: KbStatus.Canonical,
		title: "How to seed the test DB?",
		body: "## Problem\n...\n\n## Resolution\n...",
		scope: ["work"],
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("KB browse screen", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("opens an editor pre-filled with an approved entry's title, body, and scope", () => {
		renderBrowse([canonicalEntry({ title: "Deploy helper", body: "deploy body", scope: ["work"] })]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));

		const dialog = screen.getByRole("dialog");
		expect(within(dialog).getByLabelText("Title")).toHaveValue("Deploy helper");
		expect(within(dialog).getByLabelText("Body")).toHaveValue("deploy body");
		expect(within(dialog).getByText("work")).toBeInTheDocument();
	});

	it("reflects an approved entry's new title and scope on the card immediately after saving", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderBrowse([
			canonicalEntry({ id: "507f1f77bcf86cd799439011", title: "old-title", body: "body", scope: ["work"] }),
		]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));
		const dialog = screen.getByRole("dialog");

		fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "new-title" } });
		const scopeInput = within(dialog).getByLabelText("Scopes");
		fireEvent.change(scopeInput, { target: { value: "client-x" } });
		fireEvent.keyDown(scopeInput, { key: "Enter" });
		fireEvent.click(within(dialog).getByRole("button", { name: "Remove work" }));

		fireEvent.click(screen.getByRole("button", { name: /save/i }));

		// The PATCH carries the edited title and normalized scope, addressed by id, with no status.
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/kb/507f1f77bcf86cd799439011",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ title: "new-title", body: "body", scope: ["client-x"] }),
				}),
			),
		);

		// And the card reflects the new title + scope immediately, with the dialog closed — no reload.
		await waitFor(() => expect(screen.getByText("new-title")).toBeInTheDocument());
		expect(screen.getByText("client-x")).toBeInTheDocument();
		expect(screen.queryByText("old-title")).not.toBeInTheDocument();
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
	});

	it("shows the Global badge immediately after a reviewer clears an approved entry's scope", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderBrowse([canonicalEntry({ id: "507f1f77bcf86cd799439011", title: "scoped-entry", scope: ["work"] })]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));
		const dialog = screen.getByRole("dialog");

		// The reviewer removes the only scope chip, making the entry global.
		fireEvent.click(within(dialog).getByRole("button", { name: "Remove work" }));
		fireEvent.click(screen.getByRole("button", { name: /save/i }));

		// The PATCH carries an empty scope.
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/kb/507f1f77bcf86cd799439011",
				expect.objectContaining({
					body: JSON.stringify({ title: "scoped-entry", body: "## Problem\n...\n\n## Resolution\n...", scope: [] }),
				}),
			),
		);

		// And the card shows a single Global badge with the old scope tag gone — no reload.
		await waitFor(() => expect(screen.getAllByText("Global")).toHaveLength(1));
		expect(screen.queryByText("work")).not.toBeInTheDocument();
	});

	it("opens a confirm dialog when a reviewer clicks Delete on an entry", () => {
		renderBrowse([canonicalEntry({ title: "Deploy helper" })]);

		fireEvent.click(screen.getByRole("button", { name: /delete/i }));

		const dialog = screen.getByRole("dialog");
		expect(within(dialog).getByText(/delete this entry/i)).toBeInTheDocument();
	});

	it("calls DELETE on the correct URL and removes the card after confirming", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderBrowse([canonicalEntry({ id: "507f1f77bcf86cd799439011", title: "Deploy helper" })]);

		fireEvent.click(screen.getByRole("button", { name: /delete/i }));
		const dialog = screen.getByRole("dialog");
		fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/kb/507f1f77bcf86cd799439011",
				expect.objectContaining({ method: "DELETE" }),
			),
		);

		await waitFor(() => expect(screen.queryByText("Deploy helper")).not.toBeInTheDocument());
	});

	it("removes the card when DELETE responds 404, since the entry is already gone (D9 R19)", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderBrowse([canonicalEntry({ id: "507f1f77bcf86cd799439011", title: "Deploy helper" })]);

		fireEvent.click(screen.getByRole("button", { name: /delete/i }));
		const dialog = screen.getByRole("dialog");
		fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

		// A 404 means the entry is already gone — the reviewer's intent is satisfied, so the card still drops.
		await waitFor(() => expect(screen.queryByText("Deploy helper")).not.toBeInTheDocument());
	});

	it("leaves the card in place and makes no request when a reviewer cancels the delete", () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		renderBrowse([canonicalEntry({ title: "Deploy helper" })]);

		fireEvent.click(screen.getByRole("button", { name: /delete/i }));
		const dialog = screen.getByRole("dialog");
		fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByText("Deploy helper")).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
