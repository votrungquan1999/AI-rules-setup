import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const GITHUB_OWNER = "votrungquan1999";
const GITHUB_REPO = "AI-rules-setup";
const GITHUB_API_BASE = "https://api.github.com";

interface GitHubFile {
	name: string;
	path: string;
	type: "file" | "dir";
	content?: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string | null;
}

interface GitHubManifest {
	id: string;
	name: string;
	description: string;
	files: Array<{
		path: string;
		description: string;
	}>;
}

interface GitHubFixtures {
	directoryContents: Record<string, GitHubFile[]>;
	manifests: Record<string, GitHubManifest>;
	fileContents: Record<string, string>;
}

/**
 * Fetch data from GitHub API with proper error handling
 */
async function fetchFromGitHub<T>(url: string): Promise<T> {
	const response = await fetch(url, {
		headers: {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "AI-rules-setup-test-recorder",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
	}

	return response.json() as Promise<T>;
}

/**
 * Fetch directory contents from GitHub
 */
async function fetchDirectoryContents(path: string): Promise<GitHubFile[]> {
	const url = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
	return fetchFromGitHub<GitHubFile[]>(url);
}

/**
 * Fetch manifest for a specific agent and category
 */
async function fetchManifest(agent: string, category: string): Promise<GitHubManifest> {
	const url = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/rules/${agent}/${category}/manifest.json`;
	const manifest = await fetchFromGitHub<GitHubFile>(url);

	// Decode base64 content
	if (!manifest.content) {
		throw new Error("Manifest content is missing");
	}
	const content = Buffer.from(manifest.content, "base64").toString("utf-8");
	return JSON.parse(content) as GitHubManifest;
}

/**
 * Fetch file content for a specific path
 */
async function fetchFileContent(path: string): Promise<string> {
	const url = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
	const file = await fetchFromGitHub<GitHubFile>(url);

	// Decode base64 content
	if (!file.content) {
		throw new Error("File content is missing");
	}
	return Buffer.from(file.content, "base64").toString("utf-8");
}

/**
 * Record GitHub API responses to create fixtures for testing
 * This script fetches real data from GitHub and saves it to fixtures file
 */
async function recordGitHubFixtures(): Promise<void> {
	console.log("🔍 Recording GitHub API responses...");

	const fixtures: GitHubFixtures = {
		directoryContents: {},
		manifests: {},
		fileContents: {},
	};

	try {
		// 1. Fetch agents (rules directory contents)
		console.log("📁 Fetching agents...");
		const allContents = await fetchDirectoryContents("rules");
		const agents = allContents.filter((item) => item.type === "dir");
		fixtures.directoryContents.rules = agents;
		console.log(
			`✅ Found ${agents.length} agents:`,
			agents.map((a) => a.name),
		);

		// 2. For each agent, fetch categories
		for (const agent of agents) {
			console.log(`📁 Fetching categories for agent: ${agent.name}`);
			const allCategoryContents = await fetchDirectoryContents(`rules/${agent.name}`);
			const categories = allCategoryContents.filter((item) => item.type === "dir");
			fixtures.directoryContents[`rules/${agent.name}`] = categories;
			console.log(
				`✅ Found ${categories.length} categories for ${agent.name}:`,
				categories.map((c) => c.name),
			);

			// 3. For each category, fetch manifest and files
			for (const category of categories) {
				const categoryPath = `rules/${agent.name}/${category.name}`;
				const manifestKey = `${agent.name}/${category.name}`;

				try {
					console.log(`📄 Fetching manifest for ${manifestKey}...`);
					const manifest = await fetchManifest(agent.name, category.name);
					fixtures.manifests[manifestKey] = manifest;
					console.log(`✅ Manifest for ${manifestKey}:`, manifest.id);

					// 4. Fetch each rule file
					for (const fileInfo of manifest.files) {
						const filename = fileInfo.path;
						try {
							console.log(`📄 Fetching file: ${categoryPath}/${filename}...`);
							const content = await fetchFileContent(`${categoryPath}/${filename}`);
							const filePath = `${categoryPath}/${filename}`;
							fixtures.fileContents[filePath] = content;
							console.log(`✅ File ${filename} recorded (${content.length} chars)`);
						} catch (error) {
							console.warn(`⚠️  Failed to fetch ${categoryPath}/${filename}:`, error);
						}
					}
				} catch (error) {
					console.warn(`⚠️  Failed to fetch manifest for ${manifestKey}:`, error);
				}
			}
		}

		// 5. Save fixtures to file
		const fixturesPath = join(process.cwd(), "tests", "fixtures", "github-responses.json");
		await writeFile(fixturesPath, JSON.stringify(fixtures, null, 2), "utf-8");

		console.log("✅ GitHub fixtures recorded successfully!");
		console.log(`📊 Summary:`);
		console.log(`   - Agents: ${Object.keys(fixtures.directoryContents).length}`);
		console.log(`   - Manifests: ${Object.keys(fixtures.manifests).length}`);
		console.log(`   - Files: ${Object.keys(fixtures.fileContents).length}`);
		console.log(`   - Saved to: ${fixturesPath}`);
	} catch (error) {
		console.error("❌ Failed to record GitHub fixtures:", error);
		process.exit(1);
	}
}

// Run the recording script
if (require.main === module) {
	recordGitHubFixtures().catch((error) => {
		console.error("❌ Recording script failed:", error);
		process.exit(1);
	});
}

export { recordGitHubFixtures };
