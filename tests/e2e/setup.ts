import { type ChildProcess, spawn } from "node:child_process";
import { afterAll, beforeAll } from "vitest";

let apiServerProcess: ChildProcess | null = null;

/**
 * Generate a unique port number for the test suite run
 * Uses a range starting from 4000 to avoid conflicts
 */
function generateTestPort(): number {
	const basePort = 4000;
	const timestamp = Date.now();
	const random = Math.floor(Math.random() * 100);
	const port = basePort + (((timestamp % 1000) + random) % 1000);
	return port;
}

/**
 * Start a single API server shared across all E2E tests.
 * Each test file seeds its own data via beforeEach, so DB isolation is handled per-test.
 */
beforeAll(async () => {
	const testDbName = "ai-rules-e2e-test";
	const testPort = generateTestPort();
	const testApiUrl = `http://localhost:${testPort}`;

	// Set environment variables for both the API server and CLI/test helpers
	process.env.MONGODB_DB_NAME = testDbName;
	process.env.PORT = testPort.toString();
	process.env.AI_RULES_API_URL = testApiUrl;

	// Start API server
	apiServerProcess = spawn("npm", ["run", "dev:api"], {
		env: {
			...process.env,
			MONGODB_DB_NAME: testDbName,
			PORT: testPort.toString(),
		},
		stdio: "ignore",
		shell: true,
		detached: true,
	});

	// Wait for API server to be ready
	await waitForAPIReady(testPort);
}, 120000);

/**
 * Stop the shared API server after all tests complete
 */
afterAll(async () => {
	if (apiServerProcess) {
		// Kill the entire process group (shell + child Next.js process)
		const pid = apiServerProcess.pid;
		if (pid) {
			try {
				process.kill(-pid, "SIGTERM");
			} catch {
				// Process may have already exited
			}
		}
		// Wait for the process to fully exit
		await Promise.race([
			new Promise<void>((resolve) => {
				if (apiServerProcess?.exitCode !== null) return resolve();
				apiServerProcess?.on("close", () => resolve());
			}),
			new Promise<void>((resolve) => setTimeout(resolve, 5000)),
		]);
		apiServerProcess = null;
	}

	// Drop the test database
	try {
		const { getDatabase } = await import("../../src/server/database");
		const db = await getDatabase();
		await db.dropDatabase();
	} catch (error) {
		console.error(`⚠️  Failed to drop E2E test database: ${error}`);
	}

	// Clean up environment variables
	delete process.env.PORT;
	delete process.env.AI_RULES_API_URL;
	delete process.env.MONGODB_DB_NAME;
}, 10000);

/**
 * Wait for API server to be ready by polling the health check endpoint
 */
async function waitForAPIReady(port: number): Promise<void> {
	const maxAttempts = 60;
	const delay = 1000;
	const healthUrl = `http://localhost:${port}/api/health`;

	for (let i = 0; i < maxAttempts; i++) {
		try {
			const response = await fetch(healthUrl, {
				signal: AbortSignal.timeout(2000),
			});
			if (response.ok) {
				return;
			}
		} catch {
			// Server not ready yet
		}
		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	throw new Error(`API server failed to start on port ${port} within ${maxAttempts} seconds`);
}
