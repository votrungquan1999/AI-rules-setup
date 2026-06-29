import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { KbReviewPageClient } from "src/app/kb/review/KbReviewPageClient";
import { KbReviewProvider } from "src/app/kb/review/kb-review.state";
import type { KbDocDraft } from "src/app/kb/review/kb-review.type";
import { KbType } from "src/server/types";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Component tests for the KB review screen (jsdom, no browser). The reviewer can approve, reject,
 * and edit drafts; each action calls the KB API and updates the visible list when it resolves.
 */
function renderReview(drafts: KbDocDraft[]) {
	return render(
		<KbReviewProvider drafts={drafts}>
			<KbReviewPageClient />
		</KbReviewProvider>,
	);
}

function draft(overrides: Partial<KbDocDraft> = {}): KbDocDraft {
	return {
		id: "507f1f77bcf86cd799439011",
		type: KbType.Question,
		title: "How to seed the test DB?",
		body: "## Problem\n...\n\n## Resolution\n...",
		scope: ["work"],
		...overrides,
	};
}

describe("KB Review screen", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("removes a draft from the list after the reviewer approves it", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderReview([draft({ id: "507f1f77bcf86cd799439011", title: "Approve me" })]);

		expect(screen.getByText("Approve me")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Approve" }));

		// The approve endpoint is called for this draft.
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/kb/507f1f77bcf86cd799439011/approve",
				expect.objectContaining({ method: "POST" }),
			),
		);
		// And the draft disappears from the list once the call resolves.
		await waitFor(() => expect(screen.queryByText("Approve me")).not.toBeInTheDocument());
	});

	it("removes a draft from the list after the reviewer rejects it", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderReview([draft({ id: "507f1f77bcf86cd799439012", title: "Reject me" })]);

		fireEvent.click(screen.getByRole("button", { name: /reject/i }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/kb/507f1f77bcf86cd799439012/reject",
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() => expect(screen.queryByText("Reject me")).not.toBeInTheDocument());
	});

	it("disables the acted draft's Approve and Reject while pending, keeps other drafts usable, and does not re-fire", async () => {
		// Given a fetch that stays pending until we resolve it
		let resolveApprove: () => void = () => {};
		const fetchMock = vi.fn(
			() =>
				new Promise<Response>((res) => {
					resolveApprove = () => res({ ok: true } as Response);
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		renderReview([
			draft({ id: "aaaaaaaaaaaaaaaaaaaaaaaa", title: "Draft A" }),
			draft({ id: "bbbbbbbbbbbbbbbbbbbbbbbb", title: "Draft B" }),
		]);

		const approveButtons = screen.getAllByRole("button", { name: "Approve" });
		const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
		const [approveA, approveB] = approveButtons;
		const [rejectA, rejectB] = rejectButtons;
		if (!approveA || !approveB || !rejectA || !rejectB) throw new Error("expected two drafts rendered");

		// When the reviewer approves draft A (request still in flight)
		fireEvent.click(approveA);

		// Then draft A's Approve and Reject are disabled (pending)...
		await waitFor(() => expect(approveA).toBeDisabled());
		expect(rejectA).toBeDisabled();
		// ...while draft B's actions stay usable
		expect(approveB).not.toBeDisabled();
		expect(rejectB).not.toBeDisabled();

		// And a second click on the pending button does not fire another request
		fireEvent.click(approveA);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		// When the request resolves, draft A is removed and draft B remains
		resolveApprove();
		await waitFor(() => expect(screen.queryByText("Draft A")).not.toBeInTheDocument());
		expect(screen.getByText("Draft B")).toBeInTheDocument();
	});

	it("marks a global draft with a 'Global' badge while a scoped draft shows its scope", () => {
		renderReview([
			draft({ id: "507f1f77bcf86cd799439021", title: "Global draft", scope: [] }),
			draft({ id: "507f1f77bcf86cd799439022", title: "Scoped draft", scope: ["work"] }),
		]);

		// The global draft carries a single "Global" badge.
		expect(screen.getAllByText("Global")).toHaveLength(1);
		// The scoped draft surfaces its scope tag so the two are distinguishable.
		expect(screen.getByText("work")).toBeInTheDocument();
	});

	it("narrows the list to global drafts only when the filter is toggled, and restores all when toggled off", () => {
		renderReview([
			draft({ id: "507f1f77bcf86cd799439031", title: "Global draft", scope: [] }),
			draft({ id: "507f1f77bcf86cd799439032", title: "Scoped draft", scope: ["work"] }),
		]);

		// Both drafts are visible initially.
		expect(screen.getByText("Global draft")).toBeInTheDocument();
		expect(screen.getByText("Scoped draft")).toBeInTheDocument();

		// When the reviewer turns on the global-only filter, the scoped draft disappears.
		fireEvent.click(screen.getByRole("button", { name: /global only/i }));
		expect(screen.getByText("Global draft")).toBeInTheDocument();
		expect(screen.queryByText("Scoped draft")).not.toBeInTheDocument();

		// When toggled off again, both drafts are visible.
		fireEvent.click(screen.getByRole("button", { name: /show all/i }));
		expect(screen.getByText("Scoped draft")).toBeInTheDocument();
	});

	it("lets the reviewer add and remove scope tags as chips while editing a draft", () => {
		renderReview([draft({ id: "507f1f77bcf86cd799439014", title: "Editable", scope: ["work"] })]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));

		const dialog = screen.getByRole("dialog");
		// The draft's current scope is shown as a chip inside the editor.
		expect(within(dialog).getByText("work")).toBeInTheDocument();

		// Typing a tag and pressing Enter adds a new chip.
		const scopeInput = within(dialog).getByLabelText("Scopes") as HTMLInputElement;
		fireEvent.change(scopeInput, { target: { value: "client-x" } });
		fireEvent.keyDown(scopeInput, { key: "Enter" });
		expect(within(dialog).getByText("client-x")).toBeInTheDocument();

		// Clicking × on a chip removes that scope.
		fireEvent.click(within(dialog).getByRole("button", { name: "Remove work" }));
		expect(within(dialog).queryByText("work")).not.toBeInTheDocument();
	});

	it("saves a draft's edited scopes: the PATCH carries the updated scope list", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderReview([draft({ id: "507f1f77bcf86cd799439015", title: "Retag me", scope: ["work"] })]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));
		const dialog = screen.getByRole("dialog");

		// Reviewer adds a new scope and removes the original.
		const scopeInput = within(dialog).getByLabelText("Scopes") as HTMLInputElement;
		fireEvent.change(scopeInput, { target: { value: "client-x" } });
		fireEvent.keyDown(scopeInput, { key: "Enter" });
		fireEvent.click(within(dialog).getByRole("button", { name: "Remove work" }));

		fireEvent.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/kb/507f1f77bcf86cd799439015",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({
						title: "Retag me",
						body: "## Problem\n...\n\n## Resolution\n...",
						scope: ["client-x"],
					}),
				}),
			),
		);
	});

	it("shows a draft as global immediately after its scopes are cleared and saved", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderReview([draft({ id: "507f1f77bcf86cd799439016", title: "Make me global", scope: ["work"] })]);

		// The draft starts scoped — no Global badge yet.
		expect(screen.queryByText("Global")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));
		const dialog = screen.getByRole("dialog");
		fireEvent.click(within(dialog).getByRole("button", { name: "Remove work" }));
		fireEvent.click(screen.getByRole("button", { name: /save/i }));

		// After save (no reload) the card shows the Global badge.
		await waitFor(() => expect(screen.getByText("Global")).toBeInTheDocument());

		// And the now-global draft survives the global-only filter.
		fireEvent.click(screen.getByRole("button", { name: /global only/i }));
		expect(screen.getByText("Make me global")).toBeInTheDocument();
	});

	it("shows Save pending while saving and keeps the dialog open + re-enables Save when the save fails", async () => {
		// Given a save request that stays pending until we resolve it
		let resolveSave: (response: Response) => void = () => {};
		const fetchMock = vi.fn(
			() =>
				new Promise<Response>((res) => {
					resolveSave = res;
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		renderReview([draft({ id: "507f1f77bcf86cd799439099", title: "Edit me" })]);
		fireEvent.click(screen.getByRole("button", { name: /edit/i }));

		// When the reviewer saves (request in flight)
		fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /save/i }));

		// Then Save is disabled while the request is pending
		await waitFor(() =>
			expect(within(screen.getByRole("dialog")).getByRole("button", { name: /save/i })).toBeDisabled(),
		);

		// When the save fails
		resolveSave({ ok: false } as Response);

		// Then the dialog stays open and Save is usable again (so the reviewer can retry)
		await waitFor(() =>
			expect(within(screen.getByRole("dialog")).getByRole("button", { name: /save/i })).not.toBeDisabled(),
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("edits a draft via the dialog: PATCHes title/body and updates the displayed title", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
		vi.stubGlobal("fetch", fetchMock);

		renderReview([draft({ id: "507f1f77bcf86cd799439013", title: "Old title" })]);

		fireEvent.click(screen.getByRole("button", { name: /edit/i }));

		const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
		fireEvent.change(titleInput, { target: { value: "New title" } });
		fireEvent.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/kb/507f1f77bcf86cd799439013",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ title: "New title", body: "## Problem\n...\n\n## Resolution\n...", scope: ["work"] }),
				}),
			),
		);
		await waitFor(() => expect(screen.getByText("New title")).toBeInTheDocument());
	});
});
