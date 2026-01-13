import { AsyncLocalStorage } from "node:async_hooks";
import { type Db, MongoClient } from "mongodb";

/**
 * MongoDB connection configuration
 */
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-rules-cache";
// Prefer test-friendly env var name to align with tests/helpers expectations
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "ai-rules-cache";

/**
 * AsyncLocalStorage for test database context
 * Allows each test to have its own isolated database instance
 */
const testDatabaseContext = new AsyncLocalStorage<Db>();

let client: MongoClient | null = null;
let database: Db | null = null;

/**
 * Establishes MongoDB connection with connection pooling
 * @returns MongoDB client instance
 */
async function getClient(): Promise<MongoClient> {
	if (client) {
		return client;
	}

	try {
		client = new MongoClient(MONGODB_URI, {
			maxPoolSize: 10,
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,
		});

		await client.connect();
		console.log("Connected to MongoDB");
		return client;
	} catch (error) {
		console.error("Failed to connect to MongoDB:", error);
		throw new Error("Database connection failed");
	}
}

/**
 * Gets the database instance with proper error handling
 * Uses AsyncLocalStorage in tests to provide per-test database isolation
 * - If context exists (tests), returns the database instance from context
 * - If no context (production), uses singleton database instance
 * @returns MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
	// Check AsyncLocalStorage first (for test isolation)
	const testDb = testDatabaseContext.getStore();

	// If context exists (tests), return the database instance from context
	if (testDb) {
		return testDb;
	}

	// No context (production) - use singleton pattern
	if (database) {
		return database;
	}

	const mongoClient = await getClient();
	database = mongoClient.db(MONGODB_DB_NAME);

	return database;
}

/**
 * Closes the MongoDB connection
 * Should be called when the application shuts down
 */
export async function closeDatabase(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		database = null;
		console.log("MongoDB connection closed");
	}
}

/**
 * Runs a function within a test database context
 * Used in tests to provide per-test database isolation
 * Creates a database instance and stores it in AsyncLocalStorage
 * @param dbName - The database name to use for this context
 * @param fn - The function to run within the context
 * @returns The result of the function
 */
export async function runWithTestDatabase<T>(dbName: string, fn: () => Promise<T>): Promise<T> {
	const mongoClient = await getClient();
	const testDb = mongoClient.db(dbName);
	return testDatabaseContext.run(testDb, fn);
}

/**
 * Gets the current database name from context or environment
 * @returns The database name being used
 */
export function getCurrentDatabaseName(): string {
	const testDb = testDatabaseContext.getStore();
	if (testDb) {
		return testDb.databaseName;
	}
	return MONGODB_DB_NAME;
}
