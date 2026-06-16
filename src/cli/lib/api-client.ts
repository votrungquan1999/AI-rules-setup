import type { Manifest, SkillFile } from "../../server/types";

// API configuration
const API_BASE_URL = process.env.AI_RULES_API_URL || "https://ai-rules-setup.vercel.app";
const SECRET_HEADER = "x-ai-rules-secret";
const SCOPE_HEADER = "x-ai-rules-scope";

/**
 * Builds a stable cache key for a scope list. Sorts a copy and joins with commas so that two
 * arrays with the same members (in any order) compare equal across CLI calls.
 * @param scope - Optional list of scope tags
 * @returns A stable string key (empty string when no scopes)
 */
function scopeCacheKey(scope?: string[]): string {
	if (!scope || scope.length === 0) return "";
	return [...scope].sort().join(",");
}

/**
 * Builds auth headers for fetches against /api/rules.
 * Attaches the secret when `AI_RULES_SECRET` is set, and the scope only when both the secret
 * is present AND the caller supplies a non-empty scope list (scope without secret never unlocks
 * anything). The scope list is CSV-encoded into the `x-ai-rules-scope` header for the server to split.
 * @param scope - Optional list of scope tags to forward to the server
 * @returns Header map with the secret and, when applicable, the CSV-encoded scope
 */
function buildAuthHeaders(scope?: string[]): Record<string, string> {
	const secret = process.env.AI_RULES_SECRET;
	if (!secret) return {};
	const headers: Record<string, string> = { [SECRET_HEADER]: secret };
	if (scope && scope.length > 0) headers[SCOPE_HEADER] = scope.join(",");
	return headers;
}

/**
 * Client-facing knowledge-base memory as returned by `GET /api/kb/memories`. Only the fields the
 * CLI needs to materialize the managed memory file are modeled here (a separate, minimal type from
 * the server's `KbDoc` so the CLI does not depend on server internals).
 */
export interface KbMemory {
	id: string;
	title: string;
	body: string;
}

// Types for API responses
export interface RulesResponse {
	agents: {
		[agentName: string]: {
			categories: {
				[categoryName: string]: {
					manifest: Manifest;
					files: Array<{
						filename: string;
						content: string;
					}>;
				};
			};
			/** Optional skills (currently only for Claude Code) */
			skills?: Array<{
				name: string;
				content: string;
				supportingFiles?: Array<{ path: string; content: string }>;
			}>;
			/** Optional workflows (currently only for Antigravity) */
			workflows?: Array<{
				name: string;
				content: string;
			}>;
		};
	};
}

// Cache for API responses to avoid multiple calls. Keyed by scope: a different scope
// returns a different payload (private skills vary), so the cache must invalidate when
// scope changes within the same CLI invocation.
let cachedRules: RulesResponse | null = null;
let cachedScopeKey: string | undefined;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Set the cached rules data directly. Used for testing to avoid API calls.
 * Seeds the scope cache key with the normalized empty-scope key so a subsequent fetch
 * with no scope (the common test path) registers as a cache hit instead of re-fetching.
 * @param data - The rules payload to seed the cache with
 * @param scope - Optional scope list the payload corresponds to; defaults to the no-scope key
 */
export function setCachedRules(data: RulesResponse, scope?: string[]): void {
	cachedRules = data;
	cachedScopeKey = scopeCacheKey(scope);
	cacheTimestamp = Date.now();
}

/**
 * Reset the cache. Used for testing cleanup.
 */
export function resetCache(): void {
	cachedRules = null;
	cachedScopeKey = undefined;
	cacheTimestamp = 0;
}

/**
 * Fetches rules data from the API with caching keyed by scope.
 * @param scope - Optional project scope tags; CSV-encoded into the `x-ai-rules-scope` header when paired with a secret
 * @returns Complete rules data from the API
 */
async function fetchRulesData(scope?: string[]): Promise<RulesResponse> {
	const now = Date.now();
	const scopeKey = scopeCacheKey(scope);

	// Return cached data if it's still fresh AND the cached scope key matches the requested scope
	if (cachedRules && cachedScopeKey === scopeKey && now - cacheTimestamp < CACHE_DURATION) {
		return cachedRules;
	}

	try {
		const response = await fetch(`${API_BASE_URL}/api/rules`, { headers: buildAuthHeaders(scope) });

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status} ${response.statusText}`);
		}

		const data = (await response.json()) as RulesResponse;

		// Update cache
		cachedRules = data;
		cachedScopeKey = scopeKey;
		cacheTimestamp = now;

		return data;
	} catch (error) {
		throw new Error(`Failed to fetch rules from API: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Fetches available AI agents from the API
 * @returns Array of available agent names
 */
export async function fetchAvailableAgents(scope?: string[]): Promise<string[]> {
	try {
		const data = await fetchRulesData(scope);
		return Object.keys(data.agents);
	} catch (error) {
		console.error("Error fetching available agents:", error);
		return [];
	}
}

/**
 * Fetches all manifests for a specific agent from the API
 * @param agent - AI agent name (e.g., 'cursor', 'windsurf')
 * @returns Array of manifest objects
 */
export async function fetchManifests(agent: string, scope?: string[]): Promise<Manifest[]> {
	try {
		const data = await fetchRulesData(scope);
		const agentData = data.agents[agent];

		if (!agentData) {
			return [];
		}

		return Object.values(agentData.categories).map((category) => category.manifest);
	} catch (error) {
		console.error(`Error fetching manifests for agent ${agent}:`, error);
		return [];
	}
}

/**
 * Fetches content of a specific rule file from the API
 * @param agent - AI agent name (e.g., 'cursor', 'windsurf')
 * @param category - Rule category name (e.g., 'typescript', 'react')
 * @param filename - Name of the rule file
 * @returns File content as string, or null if file doesn't exist
 */
export async function fetchRuleFile(
	agent: string,
	category: string,
	filename: string,
	scope?: string[],
): Promise<string | null> {
	try {
		const data = await fetchRulesData(scope);
		const agentData = data.agents[agent];

		if (!agentData) {
			return null;
		}

		const categoryData = agentData.categories[category];
		if (!categoryData) {
			return null;
		}

		// Find the file in the array by filename
		const file = categoryData.files.find((f) => f.filename === filename);
		return file?.content || null;
	} catch (error) {
		console.error(`Error fetching rule file ${agent}/${category}/${filename}:`, error);
		return null;
	}
}

/**
 * Fetches all skills for a specific agent from the API
 * @param agent - AI agent name (e.g., 'claude-code')
 * @returns Array of skill objects with name and content, or empty array if no skills
 */
export async function fetchSkills(
	agent: string,
	scope?: string[],
): Promise<Array<{ name: string; content: string; supportingFiles?: Array<{ path: string; content: string }> }>> {
	try {
		const data = await fetchRulesData(scope);
		const agentData = data.agents[agent];

		if (!agentData || !agentData.skills) {
			return [];
		}

		return agentData.skills;
	} catch (error) {
		console.error(`Error fetching skills for agent ${agent}:`, error);
		return [];
	}
}

/**
 * Uploads a skill to the API as a private, scoped skill.
 * Attaches the `AI_RULES_SECRET` env var as the `x-ai-rules-secret` header when set.
 * Returns a structured result instead of throwing — callers decide how to surface failure.
 * @param agent - AI agent name (e.g., 'claude-code')
 * @param skill - The skill payload (name, content, optional supportingFiles)
 * @param scopes - Non-empty list of scope tags this private skill is visible under
 * @returns Object with success flag, HTTP status, and optional error string from the server
 */
export async function uploadPrivateSkill(
	agent: string,
	skill: SkillFile,
	scopes: string[],
): Promise<{ success: boolean; status: number; error?: string }> {
	const secret = process.env.AI_RULES_SECRET;
	const response = await fetch(`${API_BASE_URL}/api/skills/upload`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(secret ? { [SECRET_HEADER]: secret } : {}),
		},
		body: JSON.stringify({ agent, skill, scopes }),
	});
	if (!response.ok) {
		const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
		const failure: { success: false; status: number; error?: string } = {
			success: false,
			status: response.status,
		};
		if (errorBody.error !== undefined) failure.error = errorBody.error;
		return failure;
	}
	return { success: true, status: response.status };
}

/**
 * Fetches the workspace's canonical KB memories via `GET /api/kb/memories`. This is a standalone
 * fetch that BYPASSES the rules cache (memories are a separate endpoint and must always be fresh on
 * pull). Sends the secret + CSV-encoded scope via `buildAuthHeaders`. Throws on a non-OK response so
 * the caller can isolate failure (the pull command logs a warning and continues).
 * @param scopes - The workspace's declared scope tags
 * @returns The canonical memories for the workspace scope
 */
export async function fetchKbMemories(scopes: string[]): Promise<KbMemory[]> {
	const response = await fetch(`${API_BASE_URL}/api/kb/memories`, { headers: buildAuthHeaders(scopes) });
	if (!response.ok) {
		throw new Error(`Failed to fetch KB memories: ${response.status} ${response.statusText}`);
	}
	return (await response.json()) as KbMemory[];
}

/**
 * Fetches all workflows for a specific agent from the API
 * @param agent - AI agent name (e.g., 'antigravity')
 * @returns Array of workflow objects with name and content, or empty array if no workflows
 */
export async function fetchWorkflows(
	agent: string,
	scope?: string[],
): Promise<Array<{ name: string; content: string }>> {
	try {
		const data = await fetchRulesData(scope);
		const agentData = data.agents[agent];

		if (!agentData || !agentData.workflows) {
			return [];
		}

		return agentData.workflows;
	} catch (error) {
		console.error(`Error fetching workflows for agent ${agent}:`, error);
		return [];
	}
}
