import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type Db, MongoClient } from "mongodb";
import type {
	Manifest,
	RulesDataToStore,
	SkillFile,
	StoredRulesDocument,
	StoredSkillsDocument,
} from "../../src/server/types";
import { RULES_DATA_COLLECTION_NAME, SKILLS_COLLECTION_NAME } from "../../src/server/types";
import { createStoredRulesDocument } from "../../src/server/utils";

/**
 * Simple test fixture structure
 */
interface TestFixtureCategory {
	name: string;
	manifest: Manifest;
	files: Array<{ filename: string; content: string }>;
}

interface TestFixtureAgent {
	name: string;
	categories: TestFixtureCategory[];
	skills?: Array<{ name: string; content: string }>;
}

interface TestFixtures {
	agents: TestFixtureAgent[];
}

/**
 * Load test fixtures from the simple test data file
 */
async function loadFixtures(): Promise<TestFixtures> {
	const testDataPath =
		process.env.AI_RULES_TEST_DATA_PATH || join(process.cwd(), "tests", "fixtures", "test-data.json");

	try {
		const content = await readFile(testDataPath, "utf-8");
		return JSON.parse(content) as TestFixtures;
	} catch (error) {
		throw new Error(`Failed to load test fixtures: ${error}`);
	}
}

/**
 * Connect directly to the test database using the database name from environment
 * Does not use the production getDatabase() function
 */
async function getTestDatabase(): Promise<Db> {
	const dbName = process.env.MONGODB_DB_NAME || "ai-rules-cache-test";
	const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-rules-cache";

	const client = new MongoClient(mongoUri, {
		maxPoolSize: 10,
		serverSelectionTimeoutMS: 5000,
		socketTimeoutMS: 45000,
	});

	await client.connect();
	return client.db(dbName);
}

/**
 * Clean the test database by dropping collections
 */
async function cleanTestDatabase(db: Db): Promise<void> {
	const collections = [RULES_DATA_COLLECTION_NAME, SKILLS_COLLECTION_NAME];

	for (const collectionName of collections) {
		try {
			await db.collection(collectionName).drop();
		} catch (error) {
			// Collection might not exist, which is fine for cleaning
			if (error instanceof Error && !error.message.includes("ns not found")) {
				throw error;
			}
		}
	}
}

/**
 * Store rules data directly in the test database
 */
async function storeRulesInTestDatabase(db: Db, dataToStore: RulesDataToStore): Promise<void> {
	const collection = db.collection<StoredRulesDocument>(RULES_DATA_COLLECTION_NAME);
	const document = createStoredRulesDocument(dataToStore);

	await collection.replaceOne({ agent: dataToStore.agent, category: dataToStore.category }, document, {
		upsert: true,
	});
}

/**
 * Store skills data directly in the test database
 */
async function storeSkillsInTestDatabase(db: Db, agent: string, skills: SkillFile[]): Promise<void> {
	const collection = db.collection<StoredSkillsDocument>(SKILLS_COLLECTION_NAME);
	const now = new Date();
	const document: StoredSkillsDocument = {
		agent,
		skills,
		githubCommitSha: "test-sha",
		lastFetched: now,
		createdAt: now,
		updatedAt: now,
	};

	await collection.replaceOne({ agent }, document, { upsert: true });
}

/**
 * Seed the test database with all data from test fixtures
 * Connects directly to the test database using the database name from environment
 */
export async function seedTestDatabase(): Promise<void> {
	const db = await getTestDatabase();

	try {
		// Clean existing data
		await cleanTestDatabase(db);

		// Load fixtures
		const fixtures = await loadFixtures();

		// Process each agent
		for (const agent of fixtures.agents) {
			const agentName = agent.name;

			// Process each category
			for (const category of agent.categories) {
				// Seed this category directly in the test database
				await storeRulesInTestDatabase(db, {
					agent: agentName,
					category: category.name,
					manifest: category.manifest,
					files: category.files,
					githubCommitSha: "test-sha",
				});
			}

			// Process skills if they exist
			if (agent.skills && agent.skills.length > 0) {
				await storeSkillsInTestDatabase(db, agentName, agent.skills);
			}
		}
	} catch (error) {
		console.error("❌ Failed to seed database:", error);
		throw error;
	}
}
