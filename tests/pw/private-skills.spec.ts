import { expect, test } from "@playwright/test";
import { clearPrivateSkills, seedPrivateSkill } from "./helpers/db";

/**
 * Browser E2E for the gated private-skills page. Each test seeds its own skill in a freshly-cleared
 * collection, drives the real edit dialog, and reloads to confirm the PATCH persisted to Mongo.
 */
test.describe("Private Skills", () => {
	test.beforeEach(async () => {
		await clearPrivateSkills();
	});

	test("editing a skill updates the card and persists across reload", async ({ page }) => {
		await seedPrivateSkill(
			"claude-code",
			{ name: "Original skill", description: "Original description", content: "Original content" },
			["alpha"],
		);

		await page.goto("/private-skills");
		await page.getByRole("button", { name: "Edit" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();
		await dialog.getByLabel("Title").fill("Updated skill");
		await dialog.getByLabel("Content").fill("Updated content");
		await dialog.getByLabel("Description").fill("Updated description");
		await dialog.getByRole("button", { name: "Remove alpha" }).click();
		await dialog.getByLabel("Scopes").fill("beta");
		await dialog.getByLabel("Scopes").press("Enter");
		await dialog.getByRole("button", { name: "Save" }).click();

		// Card reflects the edit.
		await expect(page.getByRole("heading", { name: "Updated skill" })).toBeVisible();
		await expect(page.getByText("Updated description")).toBeVisible();
		await expect(page.getByText("beta")).toBeVisible();
		await expect(page.getByText("Original skill")).toHaveCount(0);

		// Reload proves the PATCH persisted; reopening the dialog confirms the (card-hidden) content too.
		await page.reload();
		await expect(page.getByRole("heading", { name: "Updated skill" })).toBeVisible();
		await expect(page.getByText("Updated description")).toBeVisible();
		await expect(page.getByText("beta")).toBeVisible();
		await page.getByRole("button", { name: "Edit" }).click();
		await expect(page.getByRole("dialog").getByLabel("Content")).toHaveValue("Updated content");
	});

	test("clearing the description removes it from the card and persists across reload", async ({ page }) => {
		await seedPrivateSkill(
			"claude-code",
			{ name: "Has description", description: "Will be cleared", content: "content" },
			[],
		);

		await page.goto("/private-skills");
		await page.getByRole("button", { name: "Edit" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();
		await dialog.getByLabel("Description").fill("");
		await dialog.getByRole("button", { name: "Save" }).click();

		await expect(page.getByRole("heading", { name: "Has description" })).toBeVisible();
		await expect(page.getByText("Will be cleared")).toHaveCount(0);

		// Reload proves the description was actually cleared in Mongo, not just hidden client-side.
		await page.reload();
		await expect(page.getByRole("heading", { name: "Has description" })).toBeVisible();
		await expect(page.getByText("Will be cleared")).toHaveCount(0);
	});
});
