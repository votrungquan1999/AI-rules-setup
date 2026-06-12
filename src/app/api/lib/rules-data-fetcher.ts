import { findAllStoredRules } from "../../../server/rules-repository";
import type { RulesData } from "../../../server/types";
import { primeCache } from "./cache-primer";

interface FetchAllRulesOptions {
	rootPath?: string;
	includePrivate?: boolean;
	projectScope?: string;
}

/**
 * Main function to fetch all rules data.
 * Checks cache first, auto-primes from local filesystem if empty.
 * `includePrivate` + `projectScope` opt the caller into receiving scope-matched private skills.
 * Defaults are safe for public callers (web UI) — they will never see private skills.
 * @param options - Optional root path, private-skill inclusion flag, and project scope filter
 * @returns Structured data with all agents, categories, manifests, and file contents
 */
export async function fetchAllRulesData(options: FetchAllRulesOptions = {}): Promise<RulesData> {
	console.log("Attempting to fetch rules data from MongoDB...");

	const findOptions: { includePrivate?: boolean; projectScope?: string } = {};
	if (options.includePrivate !== undefined) findOptions.includePrivate = options.includePrivate;
	if (options.projectScope !== undefined) findOptions.projectScope = options.projectScope;

	// Check cache first
	const cached = await findAllStoredRules(findOptions);
	if (cached) {
		console.log("Successfully fetched rules data from MongoDB storage");
		return cached;
	}

	// Cache is empty - prime it from local filesystem
	console.log("No cached data found, priming cache from local filesystem...");
	await primeCache(options.rootPath);

	// Return cached data after priming
	const data = await findAllStoredRules(findOptions);
	if (!data) {
		throw new Error("Failed to prime cache - no data available");
	}

	return data;
}
