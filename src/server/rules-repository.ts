import { getDatabase } from "./database";
import { RULES_DATA_COLLECTION_NAME, type RulesData, type RulesDataToStore, type StoredRulesDocument } from "./types";
import { createStoredRulesDocument, documentsToRulesData } from "./utils";

/**
 * Finds all stored rules from the database
 * @returns Complete rules data structure or null if no data found
 */
export async function findAllStoredRules(): Promise<RulesData | null> {
	const db = await getDatabase();
	const collection = db.collection<StoredRulesDocument>(RULES_DATA_COLLECTION_NAME);

	const documents = await collection.find({}).toArray();

	if (documents.length === 0) {
		return null;
	}

	return documentsToRulesData(documents);
}

/**
 * Stores rules data for a specific agent and category
 * @param dataToStore - Rules data to store
 * @returns True if successful, false otherwise
 */
export async function storeRulesData(dataToStore: RulesDataToStore): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<StoredRulesDocument>(RULES_DATA_COLLECTION_NAME);

	const document = createStoredRulesDocument(dataToStore);

	await collection.replaceOne({ agent: dataToStore.agent, category: dataToStore.category }, document, { upsert: true });

	console.log(`Successfully stored rules for ${dataToStore.agent}/${dataToStore.category}`);
	return true;
}
