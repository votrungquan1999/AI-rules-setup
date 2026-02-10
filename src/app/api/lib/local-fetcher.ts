import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { GitHubFile, Manifest, RulesData } from "../../../server/types";

/**
 * Fetches directory contents from local filesystem
 * @param path - Path relative to root (e.g., 'rules', 'rules/cursor')
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns Array of file/directory entries matching GitHubFile interface
 */
export async function fetchDirectoryContentsLocal(path: string, rootPath?: string): Promise<GitHubFile[]> {
	const root = rootPath || process.cwd();
	const fullPath = join(root, path);
	const entries = await readdir(fullPath, { withFileTypes: true });

	return entries.map((entry) => {
		const entryPath = `${path}/${entry.name}`;
		return {
			name: entry.name,
			path: entryPath,
			type: entry.isDirectory() ? "dir" : "file",
			download_url: `file://${join(fullPath, entry.name)}`,
		};
	});
}

/**
 * Fetches file content from local filesystem
 * @param path - Path relative to root (e.g., 'rules/cursor/typescript/manifest.json')
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns File content as string
 */
export async function fetchFileContentLocal(path: string, rootPath?: string): Promise<string> {
	const root = rootPath || process.cwd();
	const fullPath = join(root, path);
	const content = await readFile(fullPath, "utf-8");
	return content;
}

/**
 * Discovers all available AI agents from the /rules directory
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns Array of agent names
 */
export async function discoverAgentsLocal(rootPath?: string): Promise<string[]> {
	const entries = await fetchDirectoryContentsLocal("rules", rootPath);
	const agentDirs = entries.filter((entry) => entry.type === "dir").map((entry) => entry.name);
	return agentDirs;
}

/**
 * Discovers all categories for a specific agent
 * @param agent - AI agent name (e.g., 'cursor', 'claude-code', 'antigravity')
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns Array of category names
 */
export async function discoverCategoriesLocal(agent: string, rootPath?: string): Promise<string[]> {
	const entries = await fetchDirectoryContentsLocal(`rules/${agent}`, rootPath);
	const categoryDirs = entries.filter((entry) => entry.type === "dir").map((entry) => entry.name);
	return categoryDirs;
}

/**
 * Fetches and parses a manifest.json file for a specific agent and category
 * @param agent - AI agent name
 * @param category - Category name
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns Parsed manifest object or null if not found
 */
export async function fetchManifestLocal(agent: string, category: string, rootPath?: string): Promise<Manifest | null> {
	try {
		const manifestPath = `rules/${agent}/${category}/manifest.json`;
		const content = await fetchFileContentLocal(manifestPath, rootPath);
		const manifest = JSON.parse(content) as Manifest;

		// Validate manifest structure
		if (manifest.id && manifest.category && manifest.tags && manifest.description && manifest.files) {
			return manifest;
		}

		console.warn(`Invalid manifest structure for ${agent}/${category}`);
		return null;
	} catch (error) {
		console.warn(`Failed to fetch manifest for ${agent}/${category}:`, error);
		return null;
	}
}

/**
 * Discovers all available skills for a given agent from skills/{agent}/
 * @param agent - AI agent name (e.g., 'claude-code', 'antigravity')
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns Array of skill objects with name and content
 */
export async function discoverSkillsLocal(
	agent: string,
	rootPath?: string,
): Promise<Array<{ name: string; content: string }>> {
	try {
		// Check if skills directory exists for this agent
		const root = rootPath || process.cwd();
		const skillsPath = join(root, `skills/${agent}`);

		try {
			await readdir(skillsPath);
		} catch (_error) {
			// Skills directory doesn't exist for this agent - this is normal
			// Not all agents have skills, so return empty array silently
			return [];
		}

		const entries = await fetchDirectoryContentsLocal(`skills/${agent}`, rootPath);

		// Filter for .md files only (exclude README.md and SKILL.md)
		const skillFiles = entries.filter(
			(entry) =>
				entry.type === "file" && entry.name.endsWith(".md") && entry.name !== "README.md" && entry.name !== "SKILL.md",
		);

		const skills: Array<{ name: string; content: string }> = [];

		for (const file of skillFiles) {
			try {
				const content = await fetchFileContentLocal(`skills/${agent}/${file.name}`, rootPath);
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
	} catch (error) {
		console.warn(`Failed to discover skills for ${agent}:`, error);
		return [];
	}
}

/**
 * Discovers all available workflows for a given agent from workflows/{agent}/
 * @param agent - AI agent name (e.g., 'antigravity')
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns Array of workflow objects with name and content
 */
export async function discoverWorkflowsLocal(
	agent: string,
	rootPath?: string,
): Promise<Array<{ name: string; content: string }>> {
	try {
		// Check if workflows directory exists for this agent
		const root = rootPath || process.cwd();
		const workflowsPath = join(root, `workflows/${agent}`);

		try {
			await readdir(workflowsPath);
		} catch (_error) {
			// Workflows directory doesn't exist for this agent - this is normal
			// Not all agents have workflows, so return empty array silently
			return [];
		}

		const entries = await fetchDirectoryContentsLocal(`workflows/${agent}`, rootPath);

		// Filter for .md files only (exclude README.md)
		const workflowFiles = entries.filter(
			(entry) => entry.type === "file" && entry.name.endsWith(".md") && entry.name !== "README.md",
		);

		const workflows: Array<{ name: string; content: string }> = [];

		for (const file of workflowFiles) {
			try {
				const content = await fetchFileContentLocal(`workflows/${agent}/${file.name}`, rootPath);
				// Extract workflow name from filename (remove .md extension)
				const workflowName = file.name.replace(/\.md$/, "");
				workflows.push({
					name: workflowName,
					content,
				});
			} catch (error) {
				console.warn(`Failed to fetch workflow file ${file.name}:`, error);
			}
		}

		return workflows;
	} catch (error) {
		console.warn(`Failed to discover workflows for ${agent}:`, error);
		return [];
	}
}

/**
 * Fetches all rule files for a specific agent and category
 * @param agent - AI agent name
 * @param category - Category name
 * @param manifest - Manifest object containing file list
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns Array of file objects with filename and content
 */
async function fetchAllRuleFilesLocal(
	agent: string,
	category: string,
	manifest: Manifest,
	rootPath?: string,
): Promise<Array<{ filename: string; content: string }>> {
	const files: Array<{ filename: string; content: string }> = [];

	// Fetch all files in parallel
	const filePromises = manifest.files.map(async (file) => {
		try {
			const content = await fetchFileContentLocal(`rules/${agent}/${category}/${file.path}`, rootPath);
			// Extract filename from the path (last segment)
			const filename = file.path.split("/").pop() || file.path;
			files.push({ filename, content });
		} catch (error) {
			console.warn(`Failed to fetch rule file ${file.path}:`, error);
		}
	});

	await Promise.all(filePromises);
	return files;
}

/**
 * Main function to fetch all rules data from local filesystem
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns Structured data with all agents, categories, manifests, and file contents
 */
export async function fetchAllRulesDataLocal(rootPath?: string): Promise<RulesData> {
	const result: RulesData = { agents: {} };

	// Discover all agents
	const agents = await discoverAgentsLocal(rootPath);

	for (const agentName of agents) {
		result.agents[agentName] = { categories: {} };

		// Discover categories for this agent
		const categories = await discoverCategoriesLocal(agentName, rootPath);

		for (const category of categories) {
			// Fetch manifest for this category
			const manifest = await fetchManifestLocal(agentName, category, rootPath);

			if (manifest) {
				// Fetch all rule files for this category
				const files = await fetchAllRuleFilesLocal(agentName, category, manifest, rootPath);

				result.agents[agentName].categories[category] = {
					manifest,
					files,
				};
			}
		}

		// Fetch skills for this agent
		const skills = await discoverSkillsLocal(agentName, rootPath);
		if (skills.length > 0) {
			result.agents[agentName].skills = skills;
		}
	}

	return result;
}
