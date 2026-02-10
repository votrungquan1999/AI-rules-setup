/** biome-ignore-all lint/style/noNonNullAssertion: Test data is known to exist */
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cachePrimer from "../../src/app/api/lib/cache-primer";
import { fetchAllRulesData } from "../../src/app/api/lib/rules-data-fetcher";
import { findAllStoredRules } from "../../src/server/rules-repository";
import { cleanDatabase, disconnectTestDB, generateTestDatabaseName, withTestDatabase } from "../helpers/database-utils";

// Test fixtures path
const FIXTURE_ROOT = join(__dirname, "../fixtures/local-fetcher");

describe("Rules Data Fetcher", () => {
	const testDbName = generateTestDatabaseName();

	beforeEach(async () => {
		await withTestDatabase(testDbName, async () => {
			await cleanDatabase();
		});
	});

	it("fetchAllRulesData - should auto-prime cache when empty", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: Verify cache is empty
			const cachedBefore = await findAllStoredRules();
			expect(cachedBefore).toBeNull();

			// Act: Call fetchAllRulesData (should auto-prime from local filesystem)
			const data = await fetchAllRulesData(FIXTURE_ROOT);

			// Assert: Data should be returned
			expect(data).not.toBeNull();
			expect(data.agents).toBeDefined();

			// Assert: Cache should now be populated
			const cachedAfter = await findAllStoredRules();
			expect(cachedAfter).not.toBeNull();
			expect(cachedAfter).toEqual(data);

			// Cleanup
			await disconnectTestDB();
		});
	});

	it("fetchAllRulesData - should skip priming when cache is already populated", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: Spy on primeCache to track calls
			const primeCacheSpy = vi.spyOn(cachePrimer, "primeCache");

			// Act: Call fetchAllRulesData twice
			const firstCallData = await fetchAllRulesData(FIXTURE_ROOT);
			expect(firstCallData).not.toBeNull();

			const secondCallData = await fetchAllRulesData(FIXTURE_ROOT);

			// Assert: primeCache should be called only ONCE (on first call)
			expect(primeCacheSpy).toHaveBeenCalledTimes(1);

			// Assert: Should return same data without priming again
			expect(secondCallData).toEqual(firstCallData);

			// Assert: Verify cache was used (data is identical)
			const cachedData = await findAllStoredRules();
			expect(cachedData).toEqual(firstCallData);

			// Cleanup
			primeCacheSpy.mockRestore();
			await disconnectTestDB();
		});
	});

	it("fetchAllRulesData - should load correct files from filesystem", async () => {
		await withTestDatabase(testDbName, async () => {
			// Act: Get data from fetchAllRulesData (using test fixtures)
			const data = await fetchAllRulesData(FIXTURE_ROOT);

			// Assert: Should have exactly one agent: "test-agent"
			expect(Object.keys(data.agents)).toEqual(["test-agent"]);
			const testAgent = data.agents["test-agent"]!;

			// Assert: test-agent should have exactly one category: "test-category"
			expect(Object.keys(testAgent.categories)).toEqual(["test-category"]);
			const testCategory = testAgent.categories["test-category"]!;

			// Assert: Category manifest should match fixture
			expect(testCategory.manifest).toEqual({
				id: "test-category",
				category: "test-category",
				tags: ["test"],
				description: "Test category for unit tests",
				whenToUse: "When testing",
				files: [
					{
						path: "rule.md",
						description: "Test rule file",
						required: true,
					},
				],
			});

			// Assert: Category should have exactly one file
			expect(testCategory.files.length).toBe(1);
			const ruleFile = testCategory.files[0]!;
			expect(ruleFile.filename).toBe("rule.md");
			expect(ruleFile.content).toBe("# Test Rule\n\nThis is a test rule file for unit testing.\n");

			// Assert: Skills data
			expect(testAgent.skills).toBeDefined();
			expect(testAgent.skills!.length).toBe(1);
			expect(testAgent.skills![0]!.name).toBe("test-skill");
			expect(testAgent.skills![0]!.content).toContain("This is a test skill file.");

			// Cleanup
			await disconnectTestDB();
		});
	});
});
