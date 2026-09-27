import { defineConfig, devices } from "@playwright/test";

// Unit-level checks for snap.ts: pages are served from memory, no web server.
export default defineConfig({
	testDir: ".",
	testMatch: "*.test.ts",
	workers: 1,
	reporter: "list",
	use: { ...devices["Desktop Chrome"] },
});
