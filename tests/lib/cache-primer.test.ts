import { unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { clearCache, isCachePopulated, primeCache } from "../../src/app/api/lib/cache-primer";
import { findAllStoredRules } from "../../src/server/rules-repository";
import {
	cleanDatabase,
	disconnectTestDB,
	generateTestDatabaseName,
	getStoredRulesCount,
	withTestDatabase,
} from "../helpers/database-utils";

// Test fixtures path
const FIXTURE_ROOT = join(__dirname, "../fixtures/local-fetcher");

describe("Cache Primer", () => {
	const testDbName = generateTestDatabaseName();

	beforeEach(async () => {
		await withTestDatabase(testDbName, async () => {
			await cleanDatabase();
		});
	});

	it("primeCache - should prime empty cache with local data", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: Verify cache is empty
			const rulesBeforePrime = await findAllStoredRules();
			expect(rulesBeforePrime).toBeNull();

			// Act: Prime the cache with test fixtures
			await primeCache(FIXTURE_ROOT);

			// Assert: Cache should be populated
			const rulesAfterPrime = await findAllStoredRules();
			expect(rulesAfterPrime).not.toBeNull();

			// Should have test-agent rules
			expect(rulesAfterPrime?.agents["test-agent"]).toBeDefined();

			// Should have test-category
			expect(rulesAfterPrime?.agents["test-agent"]?.categories["test-category"]).toBeDefined();

			// Should have manifest and files
			const category = rulesAfterPrime?.agents["test-agent"]?.categories["test-category"];
			expect(category?.manifest.id).toBe("test-category");
			expect(category?.files).toBeDefined();
			expect(category?.files.length).toBeGreaterThan(0);

			// Should have skills
			expect(rulesAfterPrime?.agents["test-agent"]?.skills).toBeDefined();
			expect(rulesAfterPrime?.agents["test-agent"]?.skills?.length).toBeGreaterThan(0);

			// Should have workflows
			expect(rulesAfterPrime?.agents["test-agent"]?.workflows).toBeDefined();
			expect(rulesAfterPrime?.agents["test-agent"]?.workflows?.length).toBeGreaterThan(0);

			// Verify DB count
			const count = await getStoredRulesCount();
			expect(count).toBeGreaterThan(0);

			// Cleanup
			await disconnectTestDB();
		});
	});

	it("isCachePopulated - should return false when cache is empty", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: Clean database
			await cleanDatabase();

			// Act
			const isPopulated = await isCachePopulated();

			// Assert
			expect(isPopulated).toBe(false);

			// Cleanup
			await disconnectTestDB();
		});
	});

	it("isCachePopulated - should return true when cache has data", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: Prime the cache
			await primeCache(FIXTURE_ROOT);

			// Act
			const isPopulated = await isCachePopulated();

			// Assert
			expect(isPopulated).toBe(true);

			// Cleanup
			await disconnectTestDB();
		});
	});

	it("clearCache - should clear all cached data", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: Prime the cache first
			await primeCache(FIXTURE_ROOT);
			const countBefore = await getStoredRulesCount();
			expect(countBefore).toBeGreaterThan(0);

			// Act
			await clearCache();

			// Assert: Cache should be empty
			const countAfter = await getStoredRulesCount();
			expect(countAfter).toBe(0);

			const rulesAfterClear = await findAllStoredRules();
			expect(rulesAfterClear).toBeNull();

			// Cleanup
			await disconnectTestDB();
		});
	});

	it("primeCache - should not re-read filesystem if cache already populated", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: Prime cache first time
			await primeCache(FIXTURE_ROOT);
			const dataAfterFirstPrime = await findAllStoredRules();
			expect(dataAfterFirstPrime).not.toBeNull();

			// Create a new file in fixtures that would be picked up if re-reading
			const newRulePath = join(FIXTURE_ROOT, "rules/test-agent/test-category/new-rule.md");
			await writeFile(newRulePath, "# New Rule\nThis shouldn't appear in cache");

			try {
				// Act: Try to prime again (should skip and NOT read the new file)
				await primeCache(FIXTURE_ROOT);

				// Assert: Data should be identical (new file not included)
				const dataAfterSecondPrime = await findAllStoredRules();
				expect(dataAfterSecondPrime).toEqual(dataAfterFirstPrime);

				// Verify the new file is NOT in cached data
				const testCategory = dataAfterSecondPrime?.agents["test-agent"]?.categories["test-category"];
				const hasNewRule = testCategory?.files.some((f) => f.filename === "new-rule.md");
				expect(hasNewRule).toBe(false);
			} finally {
				// Cleanup: Remove the temporary file
				await unlink(newRulePath);
			}

			// Cleanup DB
			await disconnectTestDB();
		});
	});
});
