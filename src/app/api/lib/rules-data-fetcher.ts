import { findAllStoredRules } from "../../../server/rules-repository";
import type { RulesData } from "../../../server/types";
import { primeCache } from "./cache-primer";

/**
 * Main function to fetch all rules data
 * Checks cache first, auto-primes from local filesystem if empty
 * @param rootPath - Optional root directory (defaults to process.cwd())
 * @returns Structured data with all agents, categories, manifests, and file contents
 */
export async function fetchAllRulesData(rootPath?: string): Promise<RulesData> {
	console.log("Attempting to fetch rules data from MongoDB...");

	// Check cache first
	const cached = await findAllStoredRules();
	if (cached) {
		console.log("Successfully fetched rules data from MongoDB storage");
		return cached;
	}

	// Cache is empty - prime it from local filesystem
	console.log("No cached data found, priming cache from local filesystem...");
	await primeCache(rootPath);

	// Return cached data after priming
	const data = await findAllStoredRules();
	if (!data) {
		throw new Error("Failed to prime cache - no data available");
	}

	return data;
}
