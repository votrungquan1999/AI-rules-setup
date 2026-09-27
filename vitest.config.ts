import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			src: resolve(__dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "jsdom", // Use jsdom for React component testing
		testTimeout: 60000, // 60 seconds for integration tests
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		setupFiles: ["./tests/setup.ts"],
		// tests/pw and tests/visual-qa hold Playwright specs — they must run under Playwright, not Vitest.
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.history/**",
			"**/.next/**",
			"**/tests/e2e/**",
			"**/tests/pw/**",
			"**/tests/visual-qa/**",
		],
	},
});
