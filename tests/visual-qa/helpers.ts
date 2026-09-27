import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";

const ORIGIN = "http://visual-qa.test";

/** Serve HTML through a real navigation, so init scripts like the fake clock apply. */
export async function serve(page: Page, html: string): Promise<void> {
	await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ body: html, contentType: "text/html" }));
	await page.goto(`${ORIGIN}/`);
}

/** Isolated archive + visual-qa.json per test; returns the archive root. */
export async function useTempConfig(config: Record<string, unknown> = {}): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "visual-qa-test-"));
	const archiveRoot = join(dir, ".visual-qa");
	const configPath = join(dir, "visual-qa.json");
	await writeFile(configPath, JSON.stringify({ archiveRoot, viewportPreset: "desktop", ...config }));
	process.env.VISUAL_QA_CONFIG = configPath;
	// What playwright.visual.config.ts sets; without it snap() stays silent.
	process.env.VISUAL_QA = "1";
	return archiveRoot;
}

export async function readMeta(archiveRoot: string, viewport: string, name: string) {
	return JSON.parse(await readFile(join(archiveRoot, viewport, `${name}.meta.json`), "utf8"));
}

/** PNG width/height straight from the IHDR chunk. */
export async function pngSize(path: string): Promise<{ width: number; height: number }> {
	const buf = await readFile(path);
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
