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
 * Visibility of a skill — public skills are visible to anyone; private skills require
 * a matching secret + scope to retrieve.
 */
export enum SkillVisibility {
	Public = "public",
	Private = "private",
}

/**
 * Represents a single skill file
 */
export interface SkillFile {
	name: string;
	description?: string;
	content: string;
	/** Optional supporting files (nodes, scripts, references, etc.) */
	supportingFiles?: Array<{ path: string; content: string }>;
	/** Public skills get this injected at read time; private skills carry it from storage. */
	visibility?: SkillVisibility;
	/** Free-form scope tags. Required (non-empty) on private skills only. */
	scopes?: string[];
}

/**
 * Represents a single workflow file
 */
export interface WorkflowFile {
	name: string;
	description?: string;
	content: string;
}

/**
 * Represents a single hook file. Entry file is a `hook.json` manifest (metadata +
 * the Claude Code settings fragment); the executable script ships as a supporting file.
 */
export interface HookFile {
	name: string;
	description?: string;
	content: string;
	/** Optional supporting files (the executable script, docs, etc.) */
	supportingFiles?: Array<{ path: string; content: string }>;
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
	/** Optional hooks (currently only for Claude Code) */
	hooks?: HookFile[];
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
 * Database document type for stored hooks
 * Follows the database patterns with Document suffix
 */
export interface StoredHooksDocument {
	agent: string;
	hooks: HookFile[];
	githubCommitSha: string;
	lastFetched: Date;
	createdAt: Date;
	updatedAt: Date;
}

export const HOOKS_COLLECTION_NAME = "hooks_data";

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

export const PRIVATE_SKILLS_COLLECTION_NAME = "private_skills_data";

/**
 * Database document type for a single stored private skill.
 * One document per (agent, name) pair so independent uploads do not race.
 */
export interface StoredPrivateSkillDocument {
	/** Permanent stable identity, generated on first insert. Optional so legacy docs (stored before
	 * ids existed) still type-check until they are back-filled on first listing. */
	id?: string;
	agent: string;
	name: string;
	description?: string;
	content: string;
	supportingFiles?: Array<{ path: string; content: string }>;
	scopes: string[];
	createdAt: Date;
	updatedAt: Date;
}
export const KB_DOCS_COLLECTION_NAME = "kb_docs";

/**
 * The kind of knowledge a KB document represents.
 * - question: a solved question (problem + resolution)
 * - til: a "today I learned" learning note
 * - blueprint: a reusable pattern / template
 * - memory: an always-on, concise project memory
 */
export enum KbType {
	Question = "question",
	Til = "til",
	Blueprint = "blueprint",
	Memory = "memory",
}

/**
 * Review lifecycle status of a KB document.
 * - draft: captured by an agent, awaiting reviewer approval
 * - canonical: approved, returned to agents searching the knowledge base
 */
export enum KbStatus {
	Draft = "draft",
	Canonical = "canonical",
}

/**
 * Database document type for a single stored knowledge-base document.
 * Identity is MongoDB's auto-generated `_id` (ObjectId); routes look docs up by its hex string.
 * Follows the database patterns with Document suffix.
 */
export interface StoredKbDocDocument {
	/** MongoDB ObjectId; absent until inserted. */
	_id?: unknown;
	type: KbType;
	status: KbStatus;
	title: string;
	body: string;
	/** Scope tags this document is visible under. */
	scope: string[];
	/** Optional originating agent (e.g. 'claude-code'). */
	agent?: string;
	createdAt: Date;
	updatedAt: Date;
	/** When a reviewer approved/promoted this document. */
	reviewedAt?: Date;
}

/**
 * Client-facing knowledge-base document returned by repository/route layers.
 * Separate from `StoredKbDocDocument`: string `id` (from `_id.toHexString()`) and
 * Date fields serialized to ISO strings for JSON transport.
 */
export interface KbDoc {
	id: string;
	type: KbType;
	status: KbStatus;
	title: string;
	body: string;
	scope: string[];
	agent?: string;
	createdAt: string;
	updatedAt: string;
	reviewedAt?: string;
}

export const PRESETS_COLLECTION_NAME = "presets";

/**
 * Preset interface for tech-stack quick-start presets
 */
export interface Preset {
	id: string;
	name: string;
	icon: string;
	description: string;
	skills: string[];
	workflows: string[];
	rules: string[];
}

/**
 * Database document type for stored presets
 * Follows the database patterns with Document suffix
 */
export interface StoredPresetsDocument {
	agent: string;
	presets: Preset[];
	githubCommitSha: string;
	lastFetched: Date;
	createdAt: Date;
	updatedAt: Date;
}
