import { closeDatabase, getDatabase } from "../../src/server/database";
import { RULES_DATA_COLLECTION_NAME } from "../../src/server/types";

/**
 * Script to clear the MongoDB rules cache
 * This is executed by GitHub Actions when rules folder changes are pushed to main
 */
async function clearCache(): Promise<void> {
	try {
		console.log("Starting cache clearing process...");
		console.log(`Target collection: ${RULES_DATA_COLLECTION_NAME}`);

		// Connect to MongoDB
		const db = await getDatabase();
		const collection = db.collection(RULES_DATA_COLLECTION_NAME);

		// Get current document count
		const beforeCount = await collection.countDocuments();
		console.log(`Found ${beforeCount} documents in cache`);

		// Clear all cached rules
		const result = await collection.deleteMany({});
		console.log(`Successfully deleted ${result.deletedCount} documents from cache`);

		// Verify cache is empty
		const afterCount = await collection.countDocuments();
		console.log(`Cache now contains ${afterCount} documents`);

		if (afterCount === 0) {
			console.log("✓ Cache cleared successfully");
		} else {
			console.warn(`⚠ Warning: Cache still contains ${afterCount} documents after clearing`);
		}
	} catch (error) {
		console.error("✗ Failed to clear cache:", error);
		throw error;
	} finally {
		// Always close the database connection
		await closeDatabase();
	}
}

// Execute the cache clearing
clearCache()
	.then(() => {
		console.log("Cache clearing completed");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Cache clearing failed:", error);
		process.exit(1);
	});
