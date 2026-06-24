import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
					body: JSON.stringify({ title: "New title", body: "## Problem\n...\n\n## Resolution\n..." }),
				}),
			),
		);
		await waitFor(() => expect(screen.getByText("New title")).toBeInTheDocument());
	});
});
