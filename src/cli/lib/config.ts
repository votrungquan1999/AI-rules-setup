import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Config } from "./types";

/**
 * Loads configuration from .ai-rules.json file or returns default config
 * @param projectRoot - Path to the project root directory
 * @returns Configuration object
 */
export async function loadConfig(projectRoot: string): Promise<Config> {
	const configPath = join(projectRoot, ".ai-rules.json");
	try {
		const content = await readFile(configPath, "utf-8");
		const config = JSON.parse(content);

		// Validate that the config has required properties
		if (!config.version || !config.agent || !Array.isArray(config.categories)) {
			throw new Error("Invalid config format");
		}

		return config as Config;
	} catch (_error) {
		// If config file is missing or malformed, write default config to disk and return it
		const defaultConfig: Config = {
			version: "1.0.0",
			agent: "cursor",
			categories: [],
		};

		// Ensure directory exists and write the default config
		const dir = dirname(configPath);
		await mkdir(dir, { recursive: true });
		const content = JSON.stringify(defaultConfig, null, 2);
		await writeFile(configPath, content, "utf-8");

		return defaultConfig;
	}
}

/**
 * Saves configuration to .ai-rules.json file
 * @param projectRoot - Path to the project root directory
 * @param config - Configuration object to save
 */
export async function saveConfig(projectRoot: string, config: Config): Promise<void> {
	const configPath = join(projectRoot, ".ai-rules.json");

	// Create directory structure if it doesn't exist
	const dir = dirname(configPath);
	await mkdir(dir, { recursive: true });

	// Write config with pretty formatting
	const content = JSON.stringify(config, null, 2);
	await writeFile(configPath, content, "utf-8");
}

/**
 * Adds a category to the configuration
 * @param config - Current configuration object
 * @param category - Category to add
 * @returns Updated configuration object
 */
export function addCategory(config: Config, category: string): Config {
	// Check if category already exists
	if (config.categories.includes(category)) {
		// Category already exists, don't add duplicate
		return config;
	}

	// Add new category
	return {
		...config,
		categories: [...config.categories, category],
	};
}

/**
 * Adds a skill to the configuration
 * @param config - Current configuration object
 * @param skill - Skill name to add
 * @returns Updated configuration object
 */
export function addSkill(config: Config, skill: string): Config {
	const currentSkills = config.skills || [];

	// Check if skill already exists
	if (currentSkills.includes(skill)) {
		return config;
	}

	return {
		...config,
		skills: [...currentSkills, skill],
	};
}

/**
 * Adds a workflow to the configuration
 * @param config - Current configuration object
 * @param workflow - Workflow name to add
 * @returns Updated configuration object
 */
export function addWorkflow(config: Config, workflow: string): Config {
	const currentWorkflows = config.workflows || [];

	// Check if workflow already exists
	if (currentWorkflows.includes(workflow)) {
		return config;
	}

	return {
		...config,
		workflows: [...currentWorkflows, workflow],
	};
}
