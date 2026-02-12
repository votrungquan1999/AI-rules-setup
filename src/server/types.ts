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
	/** When to use this rule category - guidance for ChatGPT prompt generation */
	whenToUse: string;
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
 * Represents a single skill file
 */
export interface SkillFile {
	name: string;
	content: string;
}

/**
 * Represents a single workflow file
 */
export interface WorkflowFile {
	name: string;
	content: string;
}

/**
 * Represents an agent with all its categories and optional skills
 */
export interface RuleAgent {
	categories: {
		[categoryName: string]: RuleCategory;
	};
	/** Optional skills (currently only for Claude Code) */
	skills?: SkillFile[];
	/** Optional workflows */
	workflows?: WorkflowFile[];
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

/**
 * Database document type for stored skills
 * Follows the database patterns with Document suffix
 */
export interface StoredSkillsDocument {
	agent: string;
	skills: SkillFile[];
	githubCommitSha: string;
	lastFetched: Date;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Database document type for stored workflows
 * Follows the database patterns with Document suffix
 */
export interface StoredWorkflowsDocument {
	agent: string;
	workflows: WorkflowFile[];
	githubCommitSha: string;
	lastFetched: Date;
	createdAt: Date;
	updatedAt: Date;
}

export const WORKFLOWS_COLLECTION_NAME = "workflows";

/**
 * Question document type for individual MongoDB documents
 * Each question is stored as a separate document
 */
export interface QuestionDocument {
	/** Unique identifier in kebab-case */
	id: string;
	/** The question text */
	text: string;
	/** Question type */
	type: "yes-no" | "choice" | "open-ended";
	/** Array of tags for fuzzy search matching */
	tags: string[];
	/** Keywords for yes-no questions (optional) */
	keywords?: string[];
	/** Options for choice questions (optional) */
	options?: Array<{
		text: string;
		keywords: string[];
	}>;
	/** Source file where question was originally defined */
	sourceFile: string;
	/** When this question was cached from GitHub */
	lastFetched: Date;
	/** When this document was created */
	createdAt: Date;
	/** When this document was last updated */
	updatedAt: Date;
}

/**
 * Questions response type for server component data
 * Contains all questions fetched from database
 */
export interface QuestionsResponse {
	questions: QuestionDocument[];
}

export const QUESTIONS_COLLECTION_NAME = "questions";
export const SKILLS_COLLECTION_NAME = "skills_data";
