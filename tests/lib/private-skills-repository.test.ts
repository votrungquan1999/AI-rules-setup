import { beforeEach, describe, expect, it } from "vitest";
import { getDatabase } from "../../src/server/database";
import { findAllPrivateSkills, findAllStoredPrivateSkills } from "../../src/server/rules-repository";
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

/**
 * Integration tests for the scope-filtered `findAllStoredPrivateSkills(scopes)` — the variant the
 * CLI fetch path uses. A skill stored with an empty `scopes` array is global: it surfaces for every
 * workspace regardless of that workspace's own tags, additively with scoped matches.
 */
describe("findAllStoredPrivateSkills (scope-filtered)", () => {
	const testDbName = generateTestDatabaseName();

	beforeEach(async () => {
		await withTestDatabase(testDbName, async () => {
			await getDatabase().then((db) => db.collection(PRIVATE_SKILLS_COLLECTION_NAME).deleteMany({}));
			await cleanDatabase();
		});
	});

	it("returns a global (empty-scope) skill to a workspace whose tags don't match it", async () => {
		await withTestDatabase(testDbName, async () => {
			// Given: a global skill and a skill scoped to "other".
			const db = await getDatabase();
			await storePrivateSkillInTestDatabase(db, "claude-code", { name: "global-skill", content: "c" }, []);
			await storePrivateSkillInTestDatabase(db, "cursor", { name: "other-skill", content: "c" }, ["other"]);

			// When: a "work" workspace fetches its private skills.
			const skills = await findAllStoredPrivateSkills(["work"]);

			// Then: the global skill is returned; the non-matching scoped skill is excluded.
			expect(skills.map((s) => s.name)).toEqual(["global-skill"]);
		});
	});
});
