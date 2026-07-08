import { beforeEach, describe, expect, it } from "vitest";
import { findHooksByAgent, storeHooksData } from "../../src/server/hooks-repository";
import type { HookFile } from "../../src/server/types";
import { cleanDatabase, disconnectTestDB, generateTestDatabaseName, withTestDatabase } from "../helpers/database-utils";

describe("Hooks Repository", () => {
	const testDbName = generateTestDatabaseName();

	beforeEach(async () => {
		await withTestDatabase(testDbName, async () => {
			await cleanDatabase();
		});
	});

	it("storeHooksData - should store hooks for an agent", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange
			const agent = "claude-code";
			const hooks: HookFile[] = [{ name: "kanban-track", content: '{"description":"test"}' }];

			// Act
			const result = await storeHooksData(agent, hooks);

			// Assert
			expect(result).toBe(true);

			// Cleanup
			await disconnectTestDB();
		});
	});

	it("findHooksByAgent - should retrieve stored hooks", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: Store hooks first
			const agent = "claude-code";
			const hooks: HookFile[] = [{ name: "kanban-track", content: '{"description":"test"}' }];
			await storeHooksData(agent, hooks);

			// Act
			const retrieved = await findHooksByAgent(agent);

			// Assert
			expect(retrieved).not.toBeNull();
			expect(retrieved?.length).toBe(1);
			expect(retrieved?.[0]?.name).toBe("kanban-track");

			// Cleanup
			await disconnectTestDB();
		});
	});
});
