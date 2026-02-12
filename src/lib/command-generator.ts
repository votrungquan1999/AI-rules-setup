import type { OverwriteStrategy } from "src/cli/lib/types";

/**
 * Generates a CLI command string for non-interactive rule installation
 * @param agent - Selected AI agent (cursor, windsurf, etc.)
 * @param categories - Array of category IDs to install
 * @param overwriteStrategy - Conflict resolution strategy (prompt, force, skip)
 * @param skills - Array of skill names to install (optional, currently only for Claude Code)
 * @param workflows - Array of workflow names to install (optional, currently only for Antigravity)
 * @returns Complete CLI command string ready to copy and run
 */
export function generateCliCommand(
	agent: string,
	categories: string[],
	overwriteStrategy: OverwriteStrategy,
	skills: string[] = [],
	workflows: string[] = [],
): string {
	// Validate inputs
	if (!agent || !agent.trim()) {
		throw new Error("Agent is required");
	}

	if (categories.length === 0 && skills.length === 0 && workflows.length === 0) {
		throw new Error("At least one category, skill, or workflow must be selected");
	}

	const validStrategies: OverwriteStrategy[] = ["prompt", "force", "skip"];
	if (!validStrategies.includes(overwriteStrategy)) {
		throw new Error(`Invalid overwrite strategy: ${overwriteStrategy}`);
	}

	// Sanitize inputs
	const sanitizedAgent = sanitizeCliInput(agent);
	const sanitizedCategories = categories.length > 0 ? categories.map((cat) => sanitizeCliInput(cat)).join(",") : "";
	const sanitizedSkills = skills.length > 0 ? skills.map((skill) => sanitizeCliInput(skill)).join(",") : "";
	const sanitizedWorkflows =
		workflows.length > 0 ? workflows.map((workflow) => sanitizeCliInput(workflow)).join(",") : "";
	const sanitizedStrategy = overwriteStrategy; // Already validated above

	// Build command with npx prefix and @latest suffix
	let command = `npx @quanvo99/ai-rules@latest init --agent ${sanitizedAgent}`;

	if (sanitizedCategories) {
		command += ` --categories ${sanitizedCategories}`;
	}

	if (sanitizedSkills) {
		command += ` --skills ${sanitizedSkills}`;
	}

	if (sanitizedWorkflows) {
		command += ` --workflows ${sanitizedWorkflows}`;
	}

	command += ` --overwrite-strategy ${sanitizedStrategy}`;

	return command;
}

/**
 * Sanitizes input for use in CLI commands
 * Removes or escapes potentially dangerous characters
 * @param input - Raw input string
 * @returns Sanitized string safe for CLI use
 */
function sanitizeCliInput(input: string): string {
	// Remove any characters that could be dangerous in shell commands
	// Keep only alphanumeric, hyphens, and underscores
	return input.replace(/[^a-zA-Z0-9\-_]/g, "");
}
