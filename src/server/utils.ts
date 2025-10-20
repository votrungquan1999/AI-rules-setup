import type { RulesData, RulesDataToStore, StoredRulesDocument } from "./types";

/**
 * Converts data to store into a database document
 * @param dataToStore - Data structure for storing rules
 * @returns Database document ready for insertion
 */
export function createStoredRulesDocument(dataToStore: RulesDataToStore): StoredRulesDocument {
	const now = new Date();

	return {
		agent: dataToStore.agent,
		category: dataToStore.category,
		manifest: dataToStore.manifest,
		files: dataToStore.files,
		githubCommitSha: dataToStore.githubCommitSha || "unknown",
		lastFetched: now,
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Converts an array of database documents to the complete rules data structure
 * @param documents - Array of database documents
 * @returns Complete rules data structure
 */
export function documentsToRulesData(documents: StoredRulesDocument[]): RulesData {
	const result: RulesData = { agents: {} };

	for (const doc of documents) {
		if (!result.agents[doc.agent]) {
			result.agents[doc.agent] = { categories: {} };
		}

		if (result.agents[doc.agent]) {
			result.agents[doc.agent].categories[doc.category] = {
				manifest: doc.manifest,
				files: doc.files,
			};
		}
	}

	return result;
}
