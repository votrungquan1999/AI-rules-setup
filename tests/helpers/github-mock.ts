import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Test mode configuration
 */
export const USE_TEST_DATA = process.env.AI_RULES_USE_TEST_DATA === "true";
export const TEST_DATA_PATH =
	process.env.AI_RULES_TEST_DATA_PATH || join(process.cwd(), "tests", "fixtures", "github-responses.json");

interface GitHubFixtures {
	directoryContents: Record<string, unknown[]>;
	manifests: Record<string, unknown>;
	fileContents: Record<string, string>;
}

let fixtures: GitHubFixtures | null = null;

/**
 * Load GitHub API fixtures from the recorded responses file
 */
export async function loadFixtures(): Promise<GitHubFixtures> {
	if (fixtures) {
		return fixtures;
	}

	try {
		const content = await readFile(TEST_DATA_PATH, "utf-8");

		fixtures = JSON.parse(content) as GitHubFixtures;
		return fixtures;
	} catch (error) {
		throw new Error(`Failed to load GitHub fixtures: ${error}`);
	}
}

/**
 * Mock fetchDirectoryContents - returns data from fixtures
 */
export async function mockFetchDirectoryContents(path: string): Promise<unknown[]> {
	const fixtures = await loadFixtures();
	return fixtures.directoryContents[path] || [];
}

/**
 * Mock fetchManifest - returns data from fixtures
 */
export async function mockFetchManifest(agent: string, category: string): Promise<unknown> {
	const fixtures = await loadFixtures();
	const manifestKey = `${agent}/${category}`;
	return fixtures.manifests[manifestKey] || null;
}

/**
 * Mock fetchFileContent - returns data from fixtures
 */
export async function mockFetchFileContent(path: string): Promise<string> {
	const fixtures = await loadFixtures();
	return fixtures.fileContents[path] || "";
}
