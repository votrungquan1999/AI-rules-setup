import { beforeEach, describe, expect, it } from "vitest";
import type { WorkflowFile } from "../../src/server/types";
import { findWorkflowsByAgent, storeWorkflowsData } from "../../src/server/workflows-repository";
import { cleanDatabase, disconnectTestDB, generateTestDatabaseName, withTestDatabase } from "../helpers/database-utils";

describe("Workflows Repository", () => {
	const testDbName = generateTestDatabaseName();

	beforeEach(async () => {
		await withTestDatabase(testDbName, async () => {
			await cleanDatabase();
		});
	});

	it("storeWorkflowsData - should store workflows for an agent", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange
			const agent = "antigravity";
			const workflows: WorkflowFile[] = [
				{ name: "commit-plan", content: "# Commit Plan\nWorkflow content" },
				{ name: "review-changes", content: "# Review Changes\nWorkflow content" },
			];

			// Act
			const result = await storeWorkflowsData(agent, workflows);

			// Assert
			expect(result).toBe(true);

			// Cleanup
			await disconnectTestDB();
		});
	});

	it("findWorkflowsByAgent - should retrieve stored workflows", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: Store workflows first
			const agent = "antigravity";
			const workflows: WorkflowFile[] = [{ name: "commit-plan", content: "# Commit Plan\nWorkflow content" }];
			await storeWorkflowsData(agent, workflows);

			// Act
			const retrieved = await findWorkflowsByAgent(agent);

			// Assert
			expect(retrieved).not.toBeNull();
			expect(retrieved?.length).toBe(1);
			expect(retrieved?.[0]?.name).toBe("commit-plan");
			expect(retrieved?.[0]?.content).toContain("Commit Plan");

			// Cleanup
			await disconnectTestDB();
		});
	});
});
