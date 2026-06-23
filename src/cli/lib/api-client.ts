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

// --- Knowledge base (KB) operations ---------------------------------------------------------
// The CLI's `kb` command talks to the same `/api/kb/*` endpoints the (now-removed) MCP server used.
// These are thin HTTP wrappers; all require AI_RULES_SECRET (buildAuthHeaders attaches it).

const KB_BASE_URL = `${API_BASE_URL}/api/kb`;

/** A single ranked search hit (the canonical doc plus its 0-100 relevance score). */
export interface KbSearchHit {
	id: string;
	type: string;
	title: string;
	scope: string[];
	score: number;
}

/** A full KB document as returned by get-by-id. */
export interface KbDocResult {
	id: string;
	type: string;
	status: string;
	title: string;
	body: string;
	scope: string[];
}

/** Fields for capturing a solved question (the server composes problem/resolution into the body). */
export interface KbQuestionInput {
	title: string;
	problem: string;
	resolution: string;
}

/** Fields for capturing a TIL or blueprint (same shape; the endpoint determines the stored type). */
export interface KbBodyInput {
	title: string;
	body: string;
}

/** Fields for capturing an always-on memory (title optional; derived server-side from the body). */
export interface KbMemoryInput {
	body: string;
	title?: string;
}

/**
 * Builds KB auth headers and fails fast when the secret is missing (KB endpoints all require it).
 * @param scope - Optional scope list to CSV-encode into the scope header
 * @returns Header map including the secret (and scope when provided)
 */
function kbAuthHeaders(scope?: string[]): Record<string, string> {
	const headers = buildAuthHeaders(scope);
	if (!headers[SECRET_HEADER]) {
		throw new Error("AI_RULES_SECRET is not set — required for knowledge base access.");
	}
	return headers;
}

/**
 * Searches canonical KB docs scoped to the workspace via `GET /api/kb/search`.
 * @param query - Free-text query (empty returns all in-scope canonical docs)
 * @param scope - The workspace's scope tags (results are limited to docs sharing a tag)
 * @param type - Optional type filter (question/til/blueprint/memory)
 * @returns Ranked hits, most relevant first
 */
export async function kbSearch(query: string, scope: string[], type?: string): Promise<KbSearchHit[]> {
	const url = new URL(`${KB_BASE_URL}/search`);
	url.searchParams.set("q", query);
	if (type) url.searchParams.set("type", type);
	const response = await fetch(url.toString(), { headers: kbAuthHeaders(scope) });
	if (!response.ok) throw new Error(`KB search failed: ${response.status} ${response.statusText}`);
	const hits = (await response.json()) as Array<{ doc: KbDocResult; score: number }>;
	return hits.map((h) => ({ id: h.doc.id, type: h.doc.type, title: h.doc.title, scope: h.doc.scope, score: h.score }));
}

/**
 * Fetches a single canonical KB doc by hex id via `GET /api/kb/search?id=<hex>` (scope not consulted).
 * @param id - The document's hex ObjectId
 * @returns The document, or null when not found (404)
 */
export async function kbGet(id: string): Promise<KbDocResult | null> {
	const url = new URL(`${KB_BASE_URL}/search`);
	url.searchParams.set("id", id);
	const response = await fetch(url.toString(), { headers: kbAuthHeaders() });
	if (response.status === 404) return null;
	if (!response.ok) throw new Error(`KB get failed: ${response.status} ${response.statusText}`);
	return (await response.json()) as KbDocResult;
}

/**
 * POSTs a capture body to a `/api/kb/capture/*` route and returns the created draft's id.
 * @param path - The capture route path segment (e.g. `/capture/til`)
 * @param body - The JSON request body
 * @param scope - The workspace's scope tags (required by capture routes)
 * @returns The created draft's hex id
 */
async function kbCapture(path: string, body: unknown, scope: string[]): Promise<string> {
	const response = await fetch(`${KB_BASE_URL}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...kbAuthHeaders(scope) },
		body: JSON.stringify(body),
	});
	const data = (await response.json()) as { id?: string; error?: string };
	if (!response.ok) throw new Error(data.error ?? `KB capture failed: ${response.status} ${response.statusText}`);
	if (!data.id) throw new Error("KB capture returned no id");
	return data.id;
}

/**
 * Captures a solved question as a draft via `POST /api/kb/capture/question`.
 * @param input - The question fields (title, problem, resolution)
 * @param scope - The workspace's scope tags
 * @returns The created draft's id
 */
export async function kbCaptureQuestion(input: KbQuestionInput, scope: string[]): Promise<string> {
	return kbCapture("/capture/question", input, scope);
}

/**
 * Captures a TIL learning as a draft via `POST /api/kb/capture/til`.
 * @param input - The TIL fields (title, body)
 * @param scope - The workspace's scope tags
 * @returns The created draft's id
 */
export async function kbCaptureTil(input: KbBodyInput, scope: string[]): Promise<string> {
	return kbCapture("/capture/til", input, scope);
}

/**
 * Captures a reusable blueprint as a draft via `POST /api/kb/capture/blueprint`.
 * @param input - The blueprint fields (title, body)
 * @param scope - The workspace's scope tags
 * @returns The created draft's id
 */
export async function kbCaptureBlueprint(input: KbBodyInput, scope: string[]): Promise<string> {
	return kbCapture("/capture/blueprint", input, scope);
}

/**
 * Captures an always-on memory as a draft via `POST /api/kb/capture/memory`. The server rejects
 * (400) bodies over the conciseness cap (>200 chars or >2 lines).
 * @param input - The memory fields (body, optional title)
 * @param scope - The workspace's scope tags
 * @returns The created draft's id
 */
export async function kbCaptureMemory(input: KbMemoryInput, scope: string[]): Promise<string> {
	return kbCapture("/capture/memory", input, scope);
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
