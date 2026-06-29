// Import the config first so MONGODB_DB_NAME is set before the DB module reads it at import time.
import { TEST_DB_NAME } from "../../playwright.config";
import { closeDatabase, getDatabase } from "../../src/server/database";

/** Drops the dedicated test database and closes the runner's Mongo connection. */
export default async function globalTeardown() {
	void TEST_DB_NAME; // referenced for its import side effect (sets the DB env)
	try {
		const db = await getDatabase();
		await db.dropDatabase();
	} finally {
		await closeDatabase();
	}
}
