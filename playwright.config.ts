import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for the gated reviewer pages (/kb/review, /private-skills).
 *
 * Boots the app with `next dev` on a fixed test port against a dedicated Mongo DB, and runs every
 * spec with a pre-seeded `session` cookie (auth is setup plumbing, not under test). Specs seed/clear
 * their own Mongo data; the test DB is dropped in global teardown.
 */
const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;
export const TEST_SECRET = "test-secret";
export const TEST_DB_NAME = "ai-rules-pw-test";
export const STORAGE_STATE = resolve(__dirname, "tests/pw/.auth/state.json");

// The runner process seeds Mongo directly, so it must target the same DB/secret as the server.
process.env.MONGODB_DB_NAME = TEST_DB_NAME;
process.env.AI_RULES_SECRET = TEST_SECRET;

export default defineConfig({
	testDir: "tests/pw",
	globalSetup: resolve(__dirname, "tests/pw/global-setup.ts"),
	globalTeardown: resolve(__dirname, "tests/pw/global-teardown.ts"),
	// Gated pages mutate shared Mongo collections; serialize to keep seeded state deterministic.
	workers: 1,
	fullyParallel: false,
	timeout: 30_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL: BASE_URL,
		storageState: STORAGE_STATE,
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "npm run dev:api",
		url: `${BASE_URL}/api/health`,
		timeout: 120_000,
		reuseExistingServer: !process.env.CI,
		env: {
			PORT: String(PORT),
			MONGODB_DB_NAME: TEST_DB_NAME,
			AI_RULES_SECRET: TEST_SECRET,
		},
	},
});
