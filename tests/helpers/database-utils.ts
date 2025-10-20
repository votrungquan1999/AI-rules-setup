import { getDatabase } from "../../src/server/database";
import { findAllStoredRules, storeRulesData } from "../../src/server/rules-repository";
import type { RulesDataToStore } from "../../src/server/types";
import { RULES_DATA_COLLECTION_NAME } from "../../src/server/types";

/**
 * Connect to the test database using the existing production code
 * The test environment should set MONGODB_DB_NAME=ai-rules-test
 */
export async function connectToTestDB() {
	// The getDatabase() function will use the MONGODB_DB_NAME environment variable
	// In test environment, this should be set to "ai-rules-test"
	return await getDatabase();
}

/**
 * Clean the test database by dropping the rules_data collection
 */
export async function cleanDatabase() {
	const db = await getDatabase();
	try {
		await db.collection(RULES_DATA_COLLECTION_NAME).drop();
	} catch (error) {
		// Collection might not exist, which is fine for cleaning
		if (error instanceof Error && !error.message.includes("ns not found")) {
			throw error;
		}
	}
}

/**
 * Seed the test database with rules data using the production storeRulesData function
 */
export async function seedDatabase(data: RulesDataToStore) {
	await storeRulesData(data);
}

/**
 * Verify that the database contains data for a specific agent and category
 */
export async function verifyDatabaseHas(agent: string, category: string): Promise<boolean> {
	const db = await getDatabase();
	const doc = await db.collection(RULES_DATA_COLLECTION_NAME).findOne({ agent, category });
	return doc !== null;
}

/**
 * Get the count of stored rules in the database
 */
export async function getStoredRulesCount(): Promise<number> {
	const db = await getDatabase();
	return await db.collection(RULES_DATA_COLLECTION_NAME).countDocuments();
}

/**
 * Get all stored rules from the database
 */
export async function getAllStoredRules() {
	return await findAllStoredRules();
}

/**
 * Disconnect from the test database
 * Note: The MongoDB driver handles connection pooling, so this is mainly for cleanup
 */
export async function disconnectTestDB() {
	// The MongoDB driver handles connection cleanup automatically
	// No explicit disconnect needed for the current implementation
}
