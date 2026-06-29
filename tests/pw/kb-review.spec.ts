import { expect, test } from "@playwright/test";
import { KbType } from "../../src/server/types";
import { clearKbDocs, seedKbDraft } from "./helpers/db";

/**
 * Browser E2E for the gated KB review page. Each test seeds its own drafts in a freshly-cleared
 * collection, drives the real UI, and reloads to confirm the action persisted to Mongo.
 */
test.describe("KB Review", () => {
	test.beforeEach(async () => {
		await clearKbDocs();
	});

	test("authenticated reviewer sees a seeded draft (smoke)", async ({ page }) => {
		await seedKbDraft({
			type: KbType.Til,
			title: "Seeded draft title",
			body: "Seeded draft body",
			scope: ["alpha"],
		});

		await page.goto("/kb/review");

		// Reached the gated page (not bounced to /login) and the draft renders.
		await expect(page).toHaveURL(/\/kb\/review$/);
		await expect(page.getByRole("heading", { name: "Review Drafts" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Seeded draft title" })).toBeVisible();
	});

	test("editing a draft updates the card and persists across reload", async ({ page }) => {
		await seedKbDraft({ type: KbType.Til, title: "Original title", body: "Original body", scope: ["alpha"] });

		await page.goto("/kb/review");
		await page.getByRole("button", { name: "Edit" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();
		await dialog.getByLabel("Title").fill("Updated title");
		await dialog.getByLabel("Body").fill("Updated body");
		// Swap scope alpha → beta to exercise the scope-chips editor.
		await dialog.getByRole("button", { name: "Remove alpha" }).click();
		await dialog.getByLabel("Scopes").fill("beta");
		await dialog.getByLabel("Scopes").press("Enter");
		await dialog.getByRole("button", { name: "Save" }).click();

		// Card reflects the edit and remains in the review list (status stays draft).
		await expect(page.getByRole("heading", { name: "Updated title" })).toBeVisible();
		await expect(page.getByText("Updated body")).toBeVisible();
		await expect(page.getByText("beta")).toBeVisible();
		await expect(page.getByText("Original title")).toHaveCount(0);

		// Reload proves the PATCH round-trip persisted to Mongo.
		await page.reload();
		await expect(page.getByRole("heading", { name: "Updated title" })).toBeVisible();
		await expect(page.getByText("Updated body")).toBeVisible();
		await expect(page.getByText("beta")).toBeVisible();
	});

	test("approving a draft removes it and it stays gone after reload", async ({ page }) => {
		await seedKbDraft({ type: KbType.Til, title: "Approve me", body: "Body to approve", scope: [] });

		await page.goto("/kb/review");
		await page.getByRole("button", { name: "Approve", exact: true }).click();

		// Removed from the list; with no other drafts the empty-state shows.
		await expect(page.getByRole("heading", { name: "Approve me" })).toHaveCount(0);
		await expect(page.getByText("No drafts awaiting review.")).toBeVisible();

		// Reload proves it was promoted to canonical (no longer a draft) in Mongo.
		await page.reload();
		await expect(page.getByText("No drafts awaiting review.")).toBeVisible();
	});

	test("rejecting a draft removes it and it stays gone after reload", async ({ page }) => {
		await seedKbDraft({ type: KbType.Til, title: "Reject me", body: "Body to reject", scope: [] });

		await page.goto("/kb/review");
		await page.getByRole("button", { name: "Reject", exact: true }).click();

		await expect(page.getByRole("heading", { name: "Reject me" })).toHaveCount(0);
		await expect(page.getByText("No drafts awaiting review.")).toBeVisible();

		// Reload proves the reject persisted (draft no longer awaiting review).
		await page.reload();
		await expect(page.getByText("No drafts awaiting review.")).toBeVisible();
	});

	test("approve all clears every visible draft and persists across reload", async ({ page }) => {
		await seedKbDraft({ type: KbType.Til, title: "Bulk one", body: "Body one", scope: [] });
		await seedKbDraft({ type: KbType.Til, title: "Bulk two", body: "Body two", scope: [] });

		await page.goto("/kb/review");
		await page.getByRole("button", { name: "Approve all (2)" }).click();

		// Confirm in the dialog.
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();
		await dialog.getByRole("button", { name: "Approve all", exact: true }).click();

		await expect(page.getByRole("heading", { name: "Bulk one" })).toHaveCount(0);
		await expect(page.getByRole("heading", { name: "Bulk two" })).toHaveCount(0);
		await expect(page.getByText("No drafts awaiting review.")).toBeVisible();

		// Reload proves both were promoted to canonical in Mongo.
		await page.reload();
		await expect(page.getByText("No drafts awaiting review.")).toBeVisible();
	});
});
