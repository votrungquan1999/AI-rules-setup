/**
 * File object interface for storing rule files
 */
export interface RuleFile {
	filename: string;
	content: string;
}

/**
 * Manifest interface (copied from CLI types to avoid circular dependency)
 */
export interface Manifest {
	id: string;
	category: string;
	tags: string[];
	description: string;
	version?: string;
	lastUpdated?: string;
	files: Array<{
		path: string;
		description: string;
		required?: boolean;
	}>;
	dependencies?: string[];
	conflicts?: string[];
}

/**
 * Database document type for stored rules data
 * Follows the database patterns with Document suffix
 */
export interface StoredRulesDocument {
	agent: string;
	category: string;
	manifest: Manifest;
	files: RuleFile[];
	githubCommitSha: string;
	lastFetched: Date;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Data structure for creating/updating stored rules
 * Used when inserting or updating rules in the database
 */
export interface RulesDataToStore {
	agent: string;
	category: string;
	manifest: Manifest;
	files: RuleFile[];
	githubCommitSha: string;
}

/**
 * Static base types for rule data structure
 */

/**
 * Represents a single category with its manifest and files
 */
export interface RuleCategory {
	manifest: Manifest;
	files: RuleFile[];
}

/**
 * Represents an agent with all its categories
 */
export interface RuleAgent {
	categories: {
		[categoryName: string]: RuleCategory;
	};
}

/**
 * Complete rules data structure returned by the API
 * Matches the existing API response format
 */
export interface RulesData {
	agents: {
		[agentName: string]: RuleAgent;
	};
}

/**
 * GitHub API response types
 */
export interface GitHubFile {
	name: string;
	path: string;
	type: "file" | "dir";
	download_url?: string;
}

export interface GitHubError {
	message: string;
	documentation_url?: string;
}

export const RULES_DATA_COLLECTION_NAME = "rules_data";
