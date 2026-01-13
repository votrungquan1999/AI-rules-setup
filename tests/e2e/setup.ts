import { type ChildProcess, spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";

let apiServerProcess: ChildProcess | null = null;
let testDbName: string | null = null;
let testPort: number | null = null;
let testApiUrl: string | null = null;

/**
 * Generate a unique port number for the test
 * Uses a range starting from 4000 to avoid conflicts
 */
function generateTestPort(): number {
	// Use timestamp-based port to ensure uniqueness
	// Port range: 4000-4999 (using modulo to keep in range)
	const basePort = 4000;
	const timestamp = Date.now();
	const random = Math.floor(Math.random() * 100);
	const port = basePort + (((timestamp % 1000) + random) % 1000);
	return port;
}

/**
 * Start API server with test database for each test
 * Each E2E test gets its own isolated database and server on a unique port
 */
beforeEach(async () => {
	// Generate unique test database name for this test
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 9);
	testDbName = `ai-rules-e2e-${timestamp}-${random}`;

	// Generate unique port for this test
	testPort = generateTestPort();
	testApiUrl = `http://localhost:${testPort}`;

	// Set environment variables for API server
	process.env.MONGODB_DB_NAME = testDbName;
	process.env.PORT = testPort.toString();
	// Set API URL for CLI to use
	process.env.AI_RULES_API_URL = testApiUrl;

	// Remove Next.js lock file if it exists to avoid conflicts between test runs
	const lockFile = join(process.cwd(), ".next", "dev", "lock");
	try {
		await rm(lockFile, { force: true });
	} catch {
		// Lock file might not exist, which is fine
	}

	// Start API server with custom port
	apiServerProcess = spawn("npm", ["run", "dev:api"], {
		env: {
			...process.env,
			MONGODB_DB_NAME: testDbName,
			PORT: testPort.toString(),
		},
		stdio: "ignore", // Ignore all output from dev server
		shell: true,
	});

	// Wait for API server to be ready
	await waitForAPIReady(testPort);
}, 60000); // 60 second timeout for API server to start

/**
 * Stop API server and clean up database after each test
 */
afterEach(async () => {
	if (apiServerProcess) {
		apiServerProcess.kill();
		apiServerProcess = null;
	}

	if (testDbName) {
		// Drop test database
		const { getDatabase } = await import("../../src/server/database");
		const db = await getDatabase();
		try {
			await db.dropDatabase();
		} catch (error) {
			console.error(`⚠️  Failed to drop E2E test database: ${error}`);
		}
		testDbName = null;
	}

	// Clean up environment variables
	if (testPort) {
		delete process.env.PORT;
		testPort = null;
	}
	if (testApiUrl) {
		delete process.env.AI_RULES_API_URL;
		testApiUrl = null;
	}
}, 10000);

/**
 * Wait for API server to be ready by polling the health check endpoint
 * @param port - The port number the API server is running on
 */
async function waitForAPIReady(port: number): Promise<void> {
	const maxAttempts = 60; // Increase attempts for slower startup
	const delay = 1000;
	const healthUrl = `http://localhost:${port}/api/health`;

	for (let i = 0; i < maxAttempts; i++) {
		try {
			const response = await fetch(healthUrl, {
				signal: AbortSignal.timeout(2000), // 2 second timeout per request
			});
			if (response.ok) {
				return;
			}
		} catch {
			// Server not ready yet - continue waiting
		}
		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	throw new Error(`API server failed to start on port ${port} within ${maxAttempts} seconds`);
}
