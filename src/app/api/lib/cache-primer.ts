import { getDatabase } from "../../../server/database";
import { findAllStoredRules, storeRulesData, storeSkillsData } from "../../../server/rules-repository";
import type { Manifest } from "../../../server/types";
import { RULES_DATA_COLLECTION_NAME, SKILLS_COLLECTION_NAME } from "../../../server/types";
import { fetchAllRulesDataLocal } from "./local-fetcher";

/**
 * Primes the MongoDB cache with data from the local filesystem
 * @param rootPath - Optional root directory (defaults to process.cwd())
 */
export async function primeCache(rootPath?: string): Promise<void> {
	// Skip if cache is already populated
	if (await isCachePopulated()) {
		console.log("ℹ️  Cache already populated, skipping prime");
		return;
	}

	console.log("🔄 Priming cache with local data...");

	// Fetch all data from local filesystem
	const data = await fetchAllRulesDataLocal(rootPath);

	// Store each agent's categories
	for (const [agentName, agent] of Object.entries(data.agents)) {
		// Store each category
		for (const [categoryName, category] of Object.entries(agent.categories)) {
			await storeRulesData({
				agent: agentName,
				category: categoryName,
				manifest: category.manifest as Manifest,
				files: category.files,
				githubCommitSha: "local",
			});
		}

		// Store skills if present
		if (agent.skills && agent.skills.length > 0) {
			await storeSkillsData(agentName, agent.skills, "local");
		}
	}

	console.log("✅ Cache primed successfully");
}

/**
 * Checks if the MongoDB cache has been populated with rules data
 * @returns True if cache has data, false otherwise
 */
export async function isCachePopulated(): Promise<boolean> {
	const data = await findAllStoredRules();
	return data !== null;
}

/**
 * Clears all cached rules and skills data from MongoDB
 */
export async function clearCache(): Promise<void> {
	const db = await getDatabase();

	// Drop both collections in parallel (Promise.allSettled ensures both execute even if one fails)
	await Promise.allSettled([
		db.collection(RULES_DATA_COLLECTION_NAME).drop(),
		db.collection(SKILLS_COLLECTION_NAME).drop(),
	]);

	console.log("✅ Cache cleared successfully");
}
