import chalk from "chalk";
import inquirer from "inquirer";
import type { Manifest } from "./types";

/**
 * Displays a preview of the selected manifest with full details
 * @param manifest - The manifest to preview
 */
function showPreview(manifest: Manifest): void {
	console.clear();
	console.log(chalk.cyan.bold(`\n${manifest.id}`));
	console.log(chalk.gray("─".repeat(60)));
	console.log(`Category: ${manifest.category}`);
	console.log(`Files: ${manifest.files.length}`);
	console.log(`\nDescription:\n${manifest.description}`);
	console.log(`\nTags: ${manifest.tags.join(", ")}`);
	console.log(`\nFiles to install:`);
	manifest.files.forEach((file) => {
		console.log(chalk.green(`  • ${file.path}`));
		console.log(chalk.dim(`    ${file.description}`));
	});

	if (manifest.dependencies?.length) {
		console.log(`\nDependencies: ${manifest.dependencies.join(", ")}`);
	}
	if (manifest.conflicts?.length) {
		console.log(`\nConflicts: ${manifest.conflicts.join(", ")}`);
	}

	console.log(chalk.gray("\n[Press any key to return to selection]"));

	// Wait for keypress
	process.stdin.once("data", () => {
		console.clear();
	});
}

/**
 * Prompts user to select an AI agent
 * @param agents - Array of available agent names
 * @returns Selected agent name
 */
export async function promptAgentSelection(agents: string[]): Promise<string> {
	const { agent } = await inquirer.prompt([
		{
			type: "list",
			name: "agent",
			message: "Select an AI agent:",
			choices: agents.map((agentName) => ({
				name: chalk.cyan.bold(agentName),
				value: agentName,
			})),
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

	// Format choices with enhanced visual hierarchy
	const choices = manifests.map((manifest) => {
		const tagLine = chalk.gray(`[${manifest.tags.slice(0, 3).join(", ")}]`);
		const descLine = manifest.description.length > 60 ? `${manifest.description.slice(0, 60)}…` : manifest.description;

		return {
			name: `${chalk.cyan.bold(manifest.id)} ${tagLine}\n  ${chalk.dim(descLine)}`,
			value: manifest.id,
			short: manifest.id,
		};
	});

	const { categories } = await inquirer.prompt([
		{
			type: "checkbox",
			name: "categories",
			message: "Select rule categories to install:\n(↑↓ to move, Space to select, Enter to confirm)",
			choices,
			pageSize: 10, // Enable pagination
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
 * Prompts user to preview a specific manifest
 * @param manifest - The manifest to preview
 * @returns True if user wants to continue, false to go back
 */
export async function promptPreview(manifest: Manifest): Promise<boolean> {
	showPreview(manifest);

	const { continueSelection } = await inquirer.prompt([
		{
			type: "confirm",
			name: "continueSelection",
			message: "Continue with selection?",
			default: true,
		},
	]);

	return continueSelection;
}

/**
 * Prompts user for conflict resolution
 * @param filePath - Path to the conflicting file
 * @returns True if user wants to overwrite, false otherwise
 */
export async function promptConflictResolution(filePath: string): Promise<boolean> {
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
