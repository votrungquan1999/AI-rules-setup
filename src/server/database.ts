import { type Db, MongoClient } from "mongodb";
import { RULES_DATA_COLLECTION_NAME } from "./types";

/**
 * MongoDB connection configuration
 */
// @ts-ignore - can read env variables from process.env
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-rules-cache";
// Prefer test-friendly env var name to align with tests/helpers expectations
// @ts-ignore - can read env variables from process.env
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "ai-rules-cache";

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
 * @returns MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
	if (database) {
		return database;
	}

	const mongoClient = await getClient();
	database = mongoClient.db(MONGODB_DB_NAME);

	// Create indexes for optimal performance
	await createIndexes(database);

	return database;
}

/**
 * Creates necessary indexes for the rules_cache collection
 * @param db - MongoDB database instance
 */
async function createIndexes(db: Db): Promise<void> {
	const collection = db.collection(RULES_DATA_COLLECTION_NAME);

	// Compound unique index on agent and category
	await collection.createIndex({ agent: 1, category: 1 }, { unique: true, name: "agent_category_unique" });

	// Index on lastFetched for future cleanup jobs
	await collection.createIndex({ lastFetched: 1 }, { name: "lastFetched_index" });
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
