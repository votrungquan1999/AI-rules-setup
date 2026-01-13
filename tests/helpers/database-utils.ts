import { getCurrentDatabaseName, getDatabase, runWithTestDatabase } from "../../src/server/database";
import { storeRulesData } from "../../src/server/rules-repository";
import type { RulesDataToStore } from "../../src/server/types";
import { RULES_DATA_COLLECTION_NAME } from "../../src/server/types";

/**
 * Generate a unique database name for a test
 */
export function generateTestDatabaseName(): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 9);
	return `ai-rules-test-${timestamp}-${random}`;
}

/**
 * Get the current test database name from AsyncLocalStorage context
 */
export function getTestDatabaseName(): string {
	return getCurrentDatabaseName();
}

/**
 * Connect to the test database using the existing production code
 * This should be called within a runWithTestDatabase context
 */
export async function connectToTestDB() {
	console.log(`🔌 Connecting to test database ${getTestDatabaseName()}`);
	return await getDatabase();
}

/**
 * Run a function within a test database context
 * Creates an isolated database for the test
 */
export async function withTestDatabase<T>(dbName: string, fn: () => Promise<T>): Promise<T> {
	return runWithTestDatabase(dbName, fn);
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
 * Get the count of stored rules in the database
 */
export async function getStoredRulesCount(): Promise<number> {
	const db = await getDatabase();
	return await db.collection(RULES_DATA_COLLECTION_NAME).countDocuments();
}

/**
 * Get all categories stored for a specific agent
 */
export async function getStoredCategoriesForAgent(agent: string): Promise<string[]> {
	const db = await getDatabase();
	const docs = await db.collection(RULES_DATA_COLLECTION_NAME).find({ agent }).toArray();
	return docs.map((doc) => doc.category);
}

/**
 * Drop the test database to clean up after tests
 * Should be called within the test database context
 */
export async function dropTestDatabase(): Promise<void> {
	const db = await getDatabase();
	const dbName = getTestDatabaseName();
	try {
		await db.dropDatabase();
		console.log(`✅ Dropped test database: ${dbName}`);
	} catch (error) {
		// Database might not exist, which is fine
		if (error instanceof Error && !error.message.includes("ns not found")) {
			console.error(`⚠️  Failed to drop test database ${dbName}:`, error);
		}
	}
}

/**
 * Disconnect from the test database
 * Note: The MongoDB driver handles connection pooling, so this is mainly for cleanup
 * Should be called within the test database context
 */
export async function disconnectTestDB() {
	// Drop the test database before disconnecting
	await dropTestDatabase();
	// The MongoDB driver handles connection cleanup automatically
	// No explicit disconnect needed for the current implementation
}
