import { getDatabase } from "./database";
import type { Preset, StoredPresetsDocument } from "./types";
import { PRESETS_COLLECTION_NAME } from "./types";

/**
 * Stores presets for a specific agent
 */
export async function storePresetsData(
	agent: string,
	presets: Preset[],
	githubCommitSha = "unknown",
): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<StoredPresetsDocument>(PRESETS_COLLECTION_NAME);

	const now = new Date();

	await collection.updateOne(
		{ agent },
		{
			$set: {
				agent,
				presets,
				githubCommitSha,
				lastFetched: now,
				updatedAt: now,
			},
			$setOnInsert: {
				createdAt: now,
			},
		},
		{ upsert: true },
	);

	console.log(`Successfully stored ${presets.length} presets for ${agent}`);
	return true;
}

/**
 * Finds all stored presets from the database
 * @returns Record keyed by agent name
 */
export async function findAllStoredPresets(): Promise<Record<string, Preset[]>> {
	const db = await getDatabase();
	const collection = db.collection<StoredPresetsDocument>(PRESETS_COLLECTION_NAME);

	const documents = await collection.find({}).toArray();
	const result: Record<string, Preset[]> = {};

	for (const doc of documents) {
		result[doc.agent] = doc.presets;
	}

	return result;
}
