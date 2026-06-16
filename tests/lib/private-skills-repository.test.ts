import { beforeEach, describe, expect, it } from "vitest";
import { getDatabase } from "../../src/server/database";
import { findAllPrivateSkills } from "../../src/server/rules-repository";
import { PRIVATE_SKILLS_COLLECTION_NAME } from "../../src/server/types";
import { cleanDatabase, generateTestDatabaseName, withTestDatabase } from "../helpers/database-utils";
import { storePrivateSkillInTestDatabase } from "../helpers/seed-test-database";

/**
 * Integration tests for the reviewer-facing `findAllPrivateSkills()` — the NO-FILTER variant used
 * by the private-skills review page. Unlike `findAllStoredPrivateSkills(scopes)`, it must return
 * every private skill across all scopes so a reviewer can browse the whole catalog.
 */
describe("findAllPrivateSkills (no scope filter)", () => {
	const testDbName = generateTestDatabaseName();

	beforeEach(async () => {
		await withTestDatabase(testDbName, async () => {
			await getDatabase().then((db) => db.collection(PRIVATE_SKILLS_COLLECTION_NAME).deleteMany({}));
			await cleanDatabase();
		});
	});

	it("returns private skills from every scope, not just one", async () => {
		await withTestDatabase(testDbName, async () => {
			const db = await getDatabase();
			await storePrivateSkillInTestDatabase(db, "claude-code", { name: "work-skill", content: "c" }, ["work"]);
			await storePrivateSkillInTestDatabase(db, "cursor", { name: "client-skill", content: "c" }, ["client-x"]);

			const all = await findAllPrivateSkills();

			expect(all).toHaveLength(2);
			const names = all.map((s) => s.name).sort();
			expect(names).toEqual(["client-skill", "work-skill"]);
		});
	});
});
