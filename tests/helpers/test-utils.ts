import { constants } from "node:fs";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";

/**
 * Creates a temporary test project directory with basic structure
 * @param name - Name for the test project directory
 * @returns Path to the created test project directory
 */
export async function createTestProject(name: string): Promise<string> {
	const testDir = join(process.cwd(), "test-projects", name);

	try {
		await mkdir(testDir, { recursive: true });
		return testDir;
	} catch (error) {
		throw new Error(`Failed to create test project directory: ${error}`);
	}
}

/**
 * Removes a test project directory and all its contents
 * @param dir - Path to the test project directory to clean up
 */
export async function cleanupTestProject(dir: string): Promise<void> {
	try {
		await rm(dir, { recursive: true, force: true });
	} catch (error) {
		// Ignore cleanup errors - test directories might not exist
		console.warn(`Warning: Failed to cleanup test project ${dir}: ${error}`);
	}
}

/**
 * Spawns the CLI process with the given arguments
 * @param args - Command line arguments to pass to the CLI
 * @param options - Options for the spawned process
 * @returns Promise that resolves to the process result
 */
export async function spawnCLI(
	args: string[],
	options: {
		cwd?: string;
		input?: string;
		timeout?: number;
	} = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	try {
		// Use tsx to run the TypeScript CLI directly
		const cliPath = join(process.cwd(), "src", "cli", "index.ts");
		const result = await execa("tsx", [cliPath, ...args], {
			cwd: options.cwd || process.cwd(),
			...(options.input !== undefined && { input: options.input }),
			timeout: options.timeout || 30000,
			reject: false,
		});

		return {
			stdout: result.stdout,
			stderr: result.stderr,
			exitCode: result.exitCode || 0,
		};
	} catch (error) {
		throw new Error(`Failed to spawn CLI: ${error}`);
	}
}

/**
 * Simulates user input by providing it to the CLI process
 * @param input - Input string to send to the CLI
 * @returns Input string formatted for CLI consumption
 */
export function simulateUserInput(input: string): string {
	return input;
}

/**
 * Reads the .ai-rules.json configuration file from a project directory
 * @param projectDir - Path to the project directory
 * @returns Parsed configuration object or null if file doesn't exist
 */
export async function readConfig(projectDir: string): Promise<Record<string, unknown> | null> {
	try {
		const configPath = join(projectDir, ".ai-rules.json");
		const content = await readFile(configPath, "utf-8");
		return JSON.parse(content);
	} catch (_error) {
		return null;
	}
}

/**
 * Checks if a file exists in the given directory
 * @param dir - Directory to check in
 * @param filePath - Relative path to the file
 * @returns True if file exists, false otherwise
 */
export async function fileExists(dir: string, filePath: string): Promise<boolean> {
	try {
		const fullPath = join(dir, filePath);
		await access(fullPath, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Waits for the API server to be ready by polling the /api/rules endpoint
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @throws Error if the API doesn't become ready within the timeout
 */
export async function waitForAPIReady(timeout = 10000): Promise<void> {
	const startTime = Date.now();
	const apiUrl = "http://localhost:3000/api/rules";

	while (Date.now() - startTime < timeout) {
		try {
			const response = await fetch(apiUrl, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				return; // API is ready
			}
		} catch {
			// API not ready yet, continue polling
		}

		// Wait 500ms before next attempt
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(`API server did not become ready within ${timeout}ms`);
}
