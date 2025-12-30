import { findAllStoredRules, storeRulesData } from "../../../server/rules-repository";
import type { GitHubError, GitHubFile, Manifest, RuleAgent, RulesData, RulesDataToStore } from "../../../server/types";

/**
 * GitHub API configuration
 */
const GITHUB_OWNER = "votrungquan1999";
const GITHUB_REPO = "AI-rules-setup";
const GITHUB_BASE_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main`;

/**
 * Fetches directory contents from GitHub API
 * @param path - Path to the directory (e.g., 'rules', 'rules/cursor')
 * @returns Array of file/directory entries
 */
async function fetchDirectoryContents(path: string): Promise<GitHubFile[]> {
	const url = `${GITHUB_BASE_URL}/contents/${path}`;
	const response = await fetch(url, {
		headers: {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "AI-Rules-CLI",
		},
	});

	if (!response.ok) {
		if (response.status === 404) {
			return [];
		}
		const error: GitHubError = await response.json();
		throw new Error(`GitHub API error: ${error.message}`);
	}

	return await response.json();
}

/**
 * Fetches raw file content from GitHub
 * @param path - Path to the file (e.g., 'rules/cursor/typescript/manifest.json')
 * @returns File content as string
 */
async function fetchFileContent(path: string): Promise<string> {
	const url = `${GITHUB_RAW_URL}/${path}`;
	const response = await fetch(url, {
		headers: {
			"User-Agent": "AI-Rules-CLI",
		},
	});

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error(`File not found: ${path}`);
		}
		throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
	}

	return await response.text();
}

/**
 * Discovers all available AI agents from the /rules directory
 * @returns Array of agent names
 */
async function discoverAgents(): Promise<string[]> {
	const entries = await fetchDirectoryContents("rules");

	// Filter for directories only
	const agentDirs = entries.filter((entry) => entry.type === "dir").map((entry) => entry.name);

	return agentDirs;
}

/**
 * Discovers all categories for a specific agent
 * @param agent - AI agent name (e.g., 'cursor', 'windsurf')
 * @returns Array of category names
 */
async function discoverCategories(agent: string): Promise<string[]> {
	const entries = await fetchDirectoryContents(`rules/${agent}`);

	// Filter for directories only
	const categoryDirs = entries.filter((entry) => entry.type === "dir").map((entry) => entry.name);

	return categoryDirs;
}

/**
 * Fetches and parses a manifest.json file for a specific agent and category
 * @param agent - AI agent name
 * @param category - Category name
 * @returns Parsed manifest object or null if not found
 */
async function fetchManifest(agent: string, category: string): Promise<Manifest | null> {
	const manifestPath = `rules/${agent}/${category}/manifest.json`;
	const content = await fetchFileContent(manifestPath);
	const manifest = JSON.parse(content) as Manifest;

	// Validate manifest structure
	if (manifest.id && manifest.category && manifest.tags && manifest.description && manifest.files) {
		return manifest;
	}

	console.warn(`Invalid manifest structure for ${agent}/${category}`);
	return null;
}

/**
 * Fetches content of a specific rule file
 * @param agent - AI agent name
 * @param category - Category name
 * @param filename - Name of the rule file
 * @returns File content as string or null if not found
 */
async function fetchRuleFile(agent: string, category: string, filename: string): Promise<string | null> {
	const filePath = `rules/${agent}/${category}/${filename}`;
	const content = await fetchFileContent(filePath);
	return content;
}

/**
 * Discovers all available skills for Claude Code from skills/claude-code/
 * @returns Array of skill objects with name and content
 */
async function discoverSkills(): Promise<Array<{ name: string; content: string }>> {
	const entries = await fetchDirectoryContents("skills/claude-code");

	// Filter for .md files only (exclude README.md)
	const skillFiles = entries.filter(
		(entry) => entry.type === "file" && entry.name.endsWith(".md") && entry.name !== "README.md",
	);

	const skills: Array<{ name: string; content: string }> = [];

	for (const file of skillFiles) {
		try {
			const content = await fetchFileContent(`skills/claude-code/${file.name}`);
			// Extract skill name from filename (remove .md extension)
			const skillName = file.name.replace(/\.md$/, "");
			skills.push({
				name: skillName,
				content,
			});
		} catch (error) {
			console.warn(`Failed to fetch skill file ${file.name}:`, error);
		}
	}

	return skills;
}

/**
 * Fetches all rule files for a specific agent and category
 * @param agent - AI agent name
 * @param category - Category name
 * @param manifest - Manifest object containing file list
 * @returns Array of file objects with filename and content
 */
async function fetchAllRuleFiles(
	agent: string,
	category: string,
	manifest: Manifest,
): Promise<Array<{ filename: string; content: string }>> {
	const files: Array<{ filename: string; content: string }> = [];

	// Fetch all files in parallel
	const filePromises = manifest.files.map(async (file) => {
		const content = await fetchRuleFile(agent, category, file.path);
		if (content) {
			// Extract filename from the path (last segment)
			const filename = file.path.split("/").pop() || file.path;
			files.push({ filename, content });
		}
	});

	await Promise.all(filePromises);
	return files;
}

/**
 * Main function to fetch all rules data from MongoDB with GitHub fallback
 * First attempts to fetch from MongoDB, falls back to GitHub if data is missing
 * @returns Structured data with all agents, categories, manifests, and file contents
 */
export async function fetchAllRulesData(): Promise<RulesData> {
	// First attempt: try to fetch from MongoDB
	console.log("Attempting to fetch rules data from MongoDB...");
	const storedData = await findAllStoredRules();

	if (storedData) {
		console.log("Successfully fetched rules data from MongoDB storage");
		return storedData;
	}

	// Fallback: fetch from GitHub and store in MongoDB
	console.log("No cached data found, fetching from GitHub...");
	const result = await fetchFromGitHubAndCache();

	return result;
}

/**
 * Fetches all rules data from GitHub and stores it in MongoDB
 * @returns Structured data with all agents, categories, manifests, and file contents
 */
async function fetchFromGitHubAndCache(): Promise<RulesData> {
	const result: RulesData = { agents: {} };

	// Discover all agents
	const agents = await discoverAgents();

	for (const agentName of agents) {
		result.agents[agentName] = { categories: {} };
		const agent: RuleAgent = { categories: {} };

		// Discover categories for this agent
		const categories = await discoverCategories(agentName);

		for (const category of categories) {
			// Fetch manifest for this category
			const manifest = await fetchManifest(agentName, category);

			if (manifest) {
				// Fetch all rule files for this category
				const files = await fetchAllRuleFiles(agentName, category, manifest);

				agent.categories[category] = {
					manifest,
					files,
				};

				// Store in MongoDB for future requests
				const dataToStore: RulesDataToStore = {
					agent: agentName,
					category,
					manifest,
					files,
					githubCommitSha: "unknown", // TODO: Get actual commit SHA
				};
				await storeRulesData(dataToStore);
			}
		}

		result.agents[agentName] = agent;

		// For Claude Code, also fetch skills
		if (agentName === "claude-code") {
			console.log("Fetching skills for Claude Code...");
			const skills = await discoverSkills();
			result.agents[agentName].skills = skills;
			console.log(`Fetched ${skills.length} skills for Claude Code`);
		}
	}

	console.log("Successfully fetched and cached rules data from GitHub");
	return result;
}
