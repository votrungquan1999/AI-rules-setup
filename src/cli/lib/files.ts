import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { AIAgent, type ConflictResult } from "./types";

/**
 * Detects if a file conflict exists at the given path
 * @param filePath - Path to check for conflicts
 * @returns Conflict detection result
 */
export async function detectConflict(filePath: string): Promise<ConflictResult> {
	try {
		await access(filePath, constants.F_OK);
		return {
			hasConflict: true,
		};
	} catch {
		return {
			hasConflict: false,
		};
	}
}

/**
 * Writes rule file content to the specified path, creating directories as needed
 * @param content - Content to write to the file
 * @param targetPath - Target file path
 */
export async function writeRuleFile(content: string, targetPath: string): Promise<void> {
	// Create directory structure if it doesn't exist
	const dir = dirname(targetPath);
	await mkdir(dir, { recursive: true });

	// Write the file
	await writeFile(targetPath, content, "utf-8");
}

/**
 * Applies tool-specific naming conventions to convert source filename to target path
 * @param agent - AI agent type
 * @param filename - Source filename (preserves original extension)
 * @returns Target file path following agent conventions
 */
export function applyNamingConvention(agent: AIAgent, filename: string): string {
	switch (agent) {
		case AIAgent.CURSOR:
			return `.cursor/rules/${filename}`;

		case AIAgent.WINDSURF:
			// For Windsurf, use the filename as the category name but keep original extension
			return `.windsurf/rules/${filename}`;

		case AIAgent.AIDER:
			return `.aider/rules/${filename}`;

		case AIAgent.CONTINUE:
			return `.continue/rules/${filename}`;

		case AIAgent.CODY:
			return `.cody/rules/${filename}`;

		default:
			throw new Error(`Unsupported AI agent: ${agent}`);
	}
}
