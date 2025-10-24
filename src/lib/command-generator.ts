import type { OverwriteStrategy } from "src/cli/lib/types";

/**
 * Generates a CLI command string for non-interactive rule installation
 * @param agent - Selected AI agent (cursor, windsurf, etc.)
 * @param categories - Array of category IDs to install
 * @param overwriteStrategy - Conflict resolution strategy (prompt, force, skip)
 * @returns Complete CLI command string ready to copy and run
 */
export function generateCliCommand(agent: string, categories: string[], overwriteStrategy: OverwriteStrategy): string {
	// Validate inputs
	if (!agent || !agent.trim()) {
		throw new Error("Agent is required");
	}

	if (!categories || categories.length === 0) {
		throw new Error("At least one category must be selected");
	}

	const validStrategies: OverwriteStrategy[] = ["prompt", "force", "skip"];
	if (!validStrategies.includes(overwriteStrategy)) {
		throw new Error(`Invalid overwrite strategy: ${overwriteStrategy}`);
	}

	// Sanitize inputs
	const sanitizedAgent = sanitizeCliInput(agent);
	const sanitizedCategories = categories.map((cat) => sanitizeCliInput(cat)).join(",");
	const sanitizedStrategy = overwriteStrategy; // Already validated above

	// Build command with npx prefix and @latest suffix
	const command = `npx @quanvo99/ai-rules@latest init --agent ${sanitizedAgent} --categories ${sanitizedCategories} --overwrite-strategy ${sanitizedStrategy}`;

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
