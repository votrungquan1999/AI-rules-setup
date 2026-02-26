/**
 * Manifest file structure for rule categories
 */
export interface Manifest {
	/** Unique identifier for the rule category */
	id: string;
	/** Category name (e.g., 'typescript', 'react') */
	category: string;
	/** Tags for filtering and search */
	tags: string[];
	/** Human-readable description of the rules */
	description: string;
	/** When to use this rule category - guidance for ChatGPT prompt generation */
	whenToUse: string;
	/** List of rule files in this category */
	files: ManifestFile[];
	/** Optional dependencies on other rule categories */
	dependencies?: string[];
	/** Optional conflicts with other rule categories */
	conflicts?: string[];
}

/**
 * Individual file entry in a manifest
 */
export interface ManifestFile {
	/** Relative path to the file from the category directory */
	path: string;
	/** Description of what this file contains */
	description: string;
}

/**
 * Configuration file structure (.ai-rules.json)
 */
export interface Config {
	/** Configuration schema version */
	version: string;
	/** Selected AI agent (cursor, windsurf, etc.) */
	agent: string;
	/** List of installed rule categories */
	categories: string[];
	/** List of installed skills */
	skills?: string[];
	/** List of installed workflows */
	workflows?: string[];
}

/**
 * File mapping from source to target location
 */
export interface FileMapping {
	/** Source file path (relative to rule category) */
	source: string;
	/** Target file path (relative to project root) */
	target: string;
}

/**
 * Available AI agents
 */
export enum AIAgent {
	CURSOR = "cursor",
	WINDSURF = "windsurf",
	AIDER = "aider",
	CONTINUE = "continue",
	CODY = "cody",
	CLAUDE_CODE = "claude-code",
	ANTIGRAVITY = "antigravity",
}

/**
 * Tool-specific file naming conventions
 */
export interface ToolConventions {
	/** Base directory for rule files */
	baseDir: string;
	/** File extension for rule files */
	extension: string;
	/** Function to convert source filename to target filename */
	renameFile: (source: string, category: string) => string;
}

/**
 * Conflict detection result
 */
export interface ConflictResult {
	/** Whether a conflict exists */
	hasConflict: boolean;
	/** Absolute file path that caused the conflict (present when hasConflict is true) */
	filePath?: string;
	/** Suggested action for the caller (e.g., 'overwrite') */
	suggestedAction?: "overwrite";
}

/**
 * Overwrite strategy for handling file conflicts
 */
export type OverwriteStrategy = "prompt" | "force" | "skip";

/**
 * CLI command options
 */
export interface InitOptions {
	/** Force overwrite existing files without prompting */
	force?: boolean;
	/** Dry run mode - don't actually write files */
	dryRun?: boolean;
	/** Verbose output */
	verbose?: boolean;
	/** Specific agent to use */
	agent?: string;
	/** Specific categories to install */
	categories?: string[];
	/** Specific workflows to install */
	workflows?: string[];
	/** Specific skills to install */
	skills?: string[];
	/** Skip category installation entirely */
	noCategories?: boolean;
	/** Skip skill installation entirely */
	noSkills?: boolean;
	/** Skip workflow installation entirely */
	noWorkflows?: boolean;
	/** Overwrite strategy for file conflicts (prompt, force, skip) */
	overwriteStrategy?: OverwriteStrategy;
}
