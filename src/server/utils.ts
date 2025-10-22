import type { RuleAgent, RulesData, RulesDataToStore, StoredRulesDocument } from "./types";

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
	return documents.reduce<RulesData>(
		(acc, doc) => {
			const existingCategories = acc.agents[doc.agent]?.categories ?? {};
			const nextAgent: RuleAgent = {
				categories: {
					...existingCategories,
					[doc.category]: {
						manifest: doc.manifest,
						files: doc.files,
					},
				},
			};

			return {
				agents: {
					...acc.agents,
					[doc.agent]: nextAgent,
				},
			};
		},
		{ agents: {} },
	);
}
