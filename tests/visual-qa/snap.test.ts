import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { prepareVisualPage, snap } from "../../skills/claude-code/visual-qa/references/snap";
import { pngSize, readMeta, serve, useTempConfig } from "./helpers";

const FROZEN = "2026-01-01T00:00:00.000Z";

test("a page prepared before navigation sees the frozen clock from its first script", async ({ page }) => {
	await useTempConfig({ stabilize: { freezeClockAt: FROZEN } });
	await prepareVisualPage(page);

	await serve(
		page,
		`<p id="t"></p><script>document.getElementById("t").textContent = new Date().toISOString()</script>`,
	);
	await snap(page, "clock/at-load");

	await expect(page.locator("#t")).toHaveText(/^2026-01-01T00:00/);
});

test("snap refuses to capture when a clock freeze is configured but the page was never prepared", async ({ page }) => {
	await useTempConfig({ stabilize: { freezeClockAt: FROZEN } });
	await serve(page, "<p>hello</p>");

	await expect(snap(page, "clock/unprepared")).rejects.toThrow(/prepareVisualPage/);
});

test.describe("on a phone-sized screen", () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test("a page three screens tall is captured as several screen-sized images, not just the first screen", async ({
		page,
	}) => {
		const archiveRoot = await useTempConfig();
		await serve(
			page,
			`<style>body{margin:0}</style><div style="height:2436px;background:linear-gradient(red,blue)"></div>`,
		);

		await snap(page, "long/page");

		const meta = await readMeta(archiveRoot, "375x812", "long/page");
		expect(meta.images.length).toBeGreaterThanOrEqual(3);
		for (const file of meta.images) {
			const size = await pngSize(join(archiveRoot, "375x812", file));
			expect(size.height).toBeLessThanOrEqual(812);
		}
	});

	test("content wider than the screen shows up in the image instead of being cropped at the screen edge", async ({
		page,
	}) => {
		const archiveRoot = await useTempConfig();
		await serve(page, `<style>body{margin:0}</style><div style="width:1000px;height:200px;background:orange"></div>`);

		await snap(page, "wide/page");

		const size = await pngSize(join(archiveRoot, "375x812", "wide/page.png"));
		expect(size.width).toBe(1000);
	});

	test("the page's full width is recorded, so sideways scroll is a measured fact rather than a guess from the picture", async ({
		page,
	}) => {
		const archiveRoot = await useTempConfig();
		await serve(page, `<style>body{margin:0}</style><div style="width:1000px;height:200px;background:orange"></div>`);

		await snap(page, "wide/measured");

		const meta = await readMeta(archiveRoot, "375x812", "wide/measured");
		expect(meta.pageWidth).toBe(1000);
	});
});

test("a page that never stops changing is saved but marked unstable, so a reviewer knows not to trust it", async ({
	page,
}) => {
	const archiveRoot = await useTempConfig({ stabilize: { flakinessRetries: 2, settleMs: 50 } });
	await serve(
		page,
		`<p id="n">0</p><script>let i = 0; setInterval(() => { document.getElementById("n").textContent = String(++i) }, 20)</script>`,
	);

	await snap(page, "ticking/counter");

	const meta = await readMeta(archiveRoot, "1280x720", "ticking/counter");
	expect(meta.stable).toBe(false);
	expect(meta.attempts).toBe(3);
});

test("the image hash is written in the sha256:<hex> form the manifest compares against", async ({ page }) => {
	const archiveRoot = await useTempConfig();
	await serve(page, "<p>hello</p>");

	await snap(page, "hash/format");

	const meta = await readMeta(archiveRoot, "1280x720", "hash/format");
	expect(meta.imageHash).toMatch(/^sha256:[0-9a-f]{64}$/);
});

test("a broken visual-qa.json stops the run instead of silently capturing with default settings", async ({ page }) => {
	await useTempConfig();
	await writeFile(process.env.VISUAL_QA_CONFIG as string, "{ not json");
	await serve(page, "<p>hello</p>");

	await expect(snap(page, "config/broken")).rejects.toThrow(/visual-qa\.json/);
});

test("the source files passed to snap are recorded so a finding can point at file:line", async ({ page }) => {
	const archiveRoot = await useTempConfig();
	await serve(page, "<p>hello</p>");

	await snap(page, "setup/empty", { sources: ["src/components/setup/setup.ui.tsx"] });

	const meta = await readMeta(archiveRoot, "1280x720", "setup/empty");
	expect(meta.sources).toEqual(["src/components/setup/setup.ui.tsx"]);
});

test("the mouse is moved off the last clicked element so its hover style does not leak into the capture", async ({
	page,
}) => {
	await useTempConfig();
	await serve(page, `<style>button{margin:200px}</style><button>Next</button>`);
	await page.getByRole("button", { name: "Next" }).hover();

	await snap(page, "hover/after-click");

	await expect(page.locator("button:hover")).toHaveCount(0);
});

test("text fields have spellcheck turned off so red squiggles do not appear in some captures and not others", async ({
	page,
}) => {
	await useTempConfig();
	await serve(page, `<textarea>teh qiuck borwn fox</textarea><div contenteditable>mispeled</div>`);

	await snap(page, "spellcheck/fields");

	await expect(page.locator("textarea")).toHaveAttribute("spellcheck", "false");
	await expect(page.locator("[contenteditable]")).toHaveAttribute("spellcheck", "false");
});

test.describe("in dark mode", () => {
	test.use({ colorScheme: "dark" });

	test("dark-mode captures go to their own folder instead of overwriting the light-mode ones", async ({ page }) => {
		const archiveRoot = await useTempConfig();
		await serve(page, "<p>hello</p>");

		await snap(page, "theme/page");

		const meta = await readMeta(archiveRoot, "1280x720-dark", "theme/page");
		expect(meta.viewport).toBe("1280x720-dark");
	});
});

test("a page stuck loading can still be captured, since the loading state is itself worth reviewing", async ({
	page,
}) => {
	const archiveRoot = await useTempConfig();
	await page.route("http://visual-qa.test/", (route) =>
		route.fulfill({ contentType: "text/html", body: `<p>Loading…</p><script defer src="/app.js"></script>` }),
	);
	await page.route("**/app.js", () => {}); // never fulfilled: the page never finishes loading
	await page.goto("http://visual-qa.test/", { waitUntil: "commit" });

	const outcome = await Promise.race([
		snap(page, "app/loading").then(() => "captured"),
		new Promise((resolve) => setTimeout(() => resolve("hung"), 10_000)),
	]);

	expect(outcome).toBe("captured");
	const meta = await readMeta(archiveRoot, "1280x720", "app/loading");
	expect(meta.images).toEqual(["app/loading.png"]);
	// A reviewer must not report the fallback font on a still-loading page as a defect.
	expect(meta.fontsSettled).toBe(false);
});

test.describe("during a normal (non-visual) test run", () => {
	test("snap takes no screenshot, so ordinary e2e runs stay as fast as before", async ({ page }) => {
		const archiveRoot = await useTempConfig();
		delete process.env.VISUAL_QA;
		await serve(page, "<p>hello</p>");

		await snap(page, "normal-run/page");

		await expect(readMeta(archiveRoot, "1280x720", "normal-run/page")).rejects.toThrow(/ENOENT/);
	});

	test("prepareVisualPage leaves the real clock alone, so time-dependent e2e tests are unaffected", async ({
		page,
	}) => {
		await useTempConfig({ stabilize: { freezeClockAt: FROZEN } });
		delete process.env.VISUAL_QA;
		await prepareVisualPage(page);

		await serve(
			page,
			`<p id="t"></p><script>document.getElementById("t").textContent = new Date().toISOString()</script>`,
		);

		await expect(page.locator("#t")).not.toHaveText(/^2026-01-01/);
	});
});
