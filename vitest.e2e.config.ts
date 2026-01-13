import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			src: resolve(__dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		testTimeout: 60000, // 60 seconds for E2E tests
		// E2E tests must run sequentially
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		include: ["tests/e2e/**/*.test.ts"],
		setupFiles: ["./tests/e2e/setup.ts"],
	},
});
