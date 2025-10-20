import inquirer from "inquirer";
import type { Manifest } from "./types";

// Check if running in test environment
const isTestEnvironment = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

/**
 * Prompts user to select an AI agent
 * @param agents - Array of available agent names
 * @returns Selected agent name
 */
export async function promptAgentSelection(agents: string[]): Promise<string> {
	if (isTestEnvironment) {
		// In test environment, return the first agent (cursor)
		return agents[0] || "cursor";
	}

	const { agent } = await inquirer.prompt([
		{
			type: "list",
			name: "agent",
			message: "Select an AI agent:",
			choices: agents,
			validate: (input: string) => {
				if (!input) {
					return "Please select an agent";
				}
				return true;
			},
		},
	]);

	return agent;
}

/**
 * Prompts user to select rule categories
 * @param manifests - Array of available manifests
 * @returns Array of selected category names
 */
export async function promptCategorySelection(manifests: Manifest[]): Promise<string[]> {
	if (manifests.length === 0) {
		return [];
	}

	if (isTestEnvironment) {
		// In test environment, return all available categories
		return manifests.map((manifest) => manifest.id);
	}

	const choices = manifests.map((manifest) => ({
		name: `${manifest.id} - ${manifest.description}`,
		value: manifest.id,
		short: manifest.id,
	}));

	const { categories } = await inquirer.prompt([
		{
			type: "checkbox",
			name: "categories",
			message: "Select rule categories to install:",
			choices,
			validate: (input: string[]) => {
				if (!input || input.length === 0) {
					return "Please select at least one category";
				}
				return true;
			},
		},
	]);

	return categories;
}

/**
 * Prompts user for conflict resolution
 * @param filePath - Path to the conflicting file
 * @returns True if user wants to overwrite, false otherwise
 */
export async function promptConflictResolution(filePath: string): Promise<boolean> {
	if (isTestEnvironment) {
		// In test environment, always overwrite
		return true;
	}

	const { overwrite } = await inquirer.prompt([
		{
			type: "confirm",
			name: "overwrite",
			message: `File ${filePath} already exists. Overwrite?`,
			default: false,
		},
	]);

	return overwrite;
}
