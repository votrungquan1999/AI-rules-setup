import type { Manifest } from "../../server/types";

// API configuration
const API_BASE_URL = process.env.AI_RULES_API_URL || "https://ai-rules-setup.vercel.app";

// Types for API responses
interface RulesResponse {
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
		};
	};
}

// Cache for API responses to avoid multiple calls
let cachedRules: RulesResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches rules data from the API with caching
 * @returns Complete rules data from the API
 */
async function fetchRulesData(): Promise<RulesResponse> {
	const now = Date.now();

	// Return cached data if it's still fresh
	if (cachedRules && now - cacheTimestamp < CACHE_DURATION) {
		return cachedRules;
	}

	try {
		const response = await fetch(`${API_BASE_URL}/api/rules`);

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status} ${response.statusText}`);
		}

		const data = (await response.json()) as RulesResponse;

		// Update cache
		cachedRules = data;
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
export async function fetchAvailableAgents(): Promise<string[]> {
	try {
		const data = await fetchRulesData();
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
export async function fetchManifests(agent: string): Promise<Manifest[]> {
	try {
		const data = await fetchRulesData();
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
export async function fetchRuleFile(agent: string, category: string, filename: string): Promise<string | null> {
	try {
		const data = await fetchRulesData();
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
