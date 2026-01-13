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
		environment: "jsdom", // Use jsdom for React component testing
		testTimeout: 60000, // 60 seconds for integration tests
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		setupFiles: ["./tests/setup.ts"],
		exclude: ["**/node_modules/**", "**/dist/**", "**/tests/e2e/**"],
	},
});
