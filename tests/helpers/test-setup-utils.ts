import { constants } from "node:fs";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

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
 * Checks if the API server is ready by making a request to /api/rules endpoint
 * @throws Error if the API is not ready
 */
export async function waitForAPIReady(): Promise<void> {
	const apiUrl = "http://localhost:3000/api/rules";

	const response = await fetch(apiUrl, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`API server responded with status ${response.status}`);
	}

	console.log("✅ API server is ready");
}
