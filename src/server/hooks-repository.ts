import { getDatabase } from "./database";
import { HOOKS_COLLECTION_NAME, type HookFile, type StoredHooksDocument } from "./types";

/**
 * Stores hooks data for a specific agent
 * @param agent - Agent name (e.g., 'claude-code')
 * @param hooks - Array of hook files to store
 * @param githubCommitSha - GitHub commit SHA (optional)
 * @returns True if successful, false otherwise
 */
export async function storeHooksData(agent: string, hooks: HookFile[], githubCommitSha = "unknown"): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<StoredHooksDocument>(HOOKS_COLLECTION_NAME);

	const now = new Date();
	const document: StoredHooksDocument = {
		agent,
		hooks,
		githubCommitSha,
		lastFetched: now,
		createdAt: now,
		updatedAt: now,
	};

	await collection.replaceOne({ agent }, document, { upsert: true });

	console.log(`Successfully stored ${hooks.length} hooks for ${agent}`);
	return true;
}

/**
 * Finds hooks for a specific agent
 * @param agent - Agent name (e.g., 'claude-code')
 * @returns Array of hook files or null if not found
 */
export async function findHooksByAgent(agent: string): Promise<HookFile[] | null> {
	const db = await getDatabase();
	const collection = db.collection<StoredHooksDocument>(HOOKS_COLLECTION_NAME);

	const document = await collection.findOne({ agent });

	if (!document) {
		return null;
	}

	return document.hooks;
}
