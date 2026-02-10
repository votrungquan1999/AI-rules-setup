import { clearCache, primeCache } from "../../src/app/api/lib/cache-primer";
import { closeDatabase } from "../../src/server/database";

/**
 * Script to prime the MongoDB cache with data from local filesystem
 * This is executed by GitHub Actions when rules/skills/workflows changes are pushed to main
 *
 * Since the serverless/edge environment doesn't have filesystem access,
 * the GitHub Action runner (which has the full repository) must prime the cache
 * by reading local files and populating MongoDB directly.
 */
async function primeCacheFromLocal(): Promise<void> {
	try {
		console.log("Starting cache refresh process...");

		// Clear existing cache to remove stale data
		console.log("Clearing existing cache...");
		await clearCache();

		// Prime the cache using the local filesystem
		console.log("Reading rules, skills, and workflows from local filesystem...");
		await primeCache();

		console.log("✓ Cache refreshed successfully from local filesystem");
	} catch (error) {
		console.error("✗ Failed to prime cache:", error);
		throw error;
	} finally {
		// Always close the database connection
		await closeDatabase();
	}
}

// Execute the cache refresh
primeCacheFromLocal()
	.then(() => {
		console.log("Cache refresh completed");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Cache refresh failed:", error);
		process.exit(1);
	});
