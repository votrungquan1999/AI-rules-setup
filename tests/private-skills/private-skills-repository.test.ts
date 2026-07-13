// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getDatabase } from "../../src/server/database";
import {
	deletePrivateSkill,
	findAllPrivateSkills,
	storePrivateSkill,
	updatePrivateSkill,
} from "../../src/server/rules-repository";
import { PRIVATE_SKILLS_COLLECTION_NAME, type StoredPrivateSkillDocument } from "../../src/server/types";
import { dropTestDatabase, generateTestDatabaseName, withTestDatabase } from "../helpers/database-utils";

/**
 * Integration tests for the private-skills repository functions, run directly against a local
 * MongoDB in an isolated per-test database (no Next.js server). Covers the stable-id lifecycle
 * (Step 4) and the scope/title/content update path (Step 5).
 */
describe("private skills repository", () => {
	it("assigns a permanent id on first upload and keeps it across re-uploads", async () => {
		await withTestDatabase(generateTestDatabaseName(), async () => {
			try {
				// Given a private skill is uploaded for the first time.
				await storePrivateSkill("claude-code", { name: "id-skill", content: "v1" }, ["work"]);
				const afterFirst = await findAllPrivateSkills();
				const first = afterFirst.find((s) => s.name === "id-skill");

				// Then it has a permanent string id.
				expect(typeof first?.id).toBe("string");
				expect(first?.id?.length).toBeGreaterThan(0);

				// When the same (agent, name) is re-uploaded with new content.
				await storePrivateSkill("claude-code", { name: "id-skill", content: "v2" }, ["work", "client-x"]);
				const afterSecond = await findAllPrivateSkills();
				const second = afterSecond.find((s) => s.name === "id-skill");

				// Then the content updates but the id stays stable.
				expect(second?.content).toBe("v2");
				expect(second?.id).toBe(first?.id);
			} finally {
				await dropTestDatabase();
			}
		});
	});

	it("back-fills a permanent id for a skill stored before ids existed, and persists it", async () => {
		await withTestDatabase(generateTestDatabaseName(), async () => {
			try {
				// Given a legacy doc inserted directly with no id (pre-dates the id field).
				const db = await getDatabase();
				const now = new Date();
				await db.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME).insertOne({
					agent: "claude-code",
					name: "legacy",
					content: "old",
					scopes: ["work"],
					createdAt: now,
					updatedAt: now,
				});

				// When the reviewer page lists all private skills.
				const listed = await findAllPrivateSkills();
				const legacy = listed.find((s) => s.name === "legacy");

				// Then the legacy skill now carries a permanent id.
				expect(typeof legacy?.id).toBe("string");
				expect(legacy?.id?.length).toBeGreaterThan(0);

				// And that id is persisted: a second listing returns the same id, not a fresh one.
				const relisted = await findAllPrivateSkills();
				const again = relisted.find((s) => s.name === "legacy");
				expect(again?.id).toBe(legacy?.id);
			} finally {
				await dropTestDatabase();
			}
		});
	});

	it("updates a skill's title, content, description, and scopes by id, leaving the owning agent intact", async () => {
		await withTestDatabase(generateTestDatabaseName(), async () => {
			try {
				// Given a stored private skill with an id.
				await storePrivateSkill("claude-code", { name: "orig", content: "c1", description: "d1" }, ["work"]);
				const stored = (await findAllPrivateSkills()).find((s) => s.name === "orig");
				const id = stored?.id;
				if (!id) throw new Error("expected stored skill to have an id");

				// When all four editable fields are updated by id.
				const ok = await updatePrivateSkill(id, {
					name: "renamed",
					content: "c2",
					description: "d2",
					scopes: ["client-x"],
				});

				// Then the update reports success and all four fields are persisted, agent untouched.
				expect(ok).toBe(true);
				const after = (await findAllPrivateSkills()).find((s) => s.id === id);
				expect(after?.name).toBe("renamed");
				expect(after?.content).toBe("c2");
				expect(after?.description).toBe("d2");
				expect(after?.scopes).toEqual(["client-x"]);
				expect(after?.agent).toBe("claude-code");
			} finally {
				await dropTestDatabase();
			}
		});
	});

	it("updates only the provided field, leaving the others intact", async () => {
		await withTestDatabase(generateTestDatabaseName(), async () => {
			try {
				// Given a stored private skill with all editable fields set.
				await storePrivateSkill("claude-code", { name: "partial-skill", content: "c1", description: "d1" }, ["work"]);
				const stored = (await findAllPrivateSkills()).find((s) => s.name === "partial-skill");
				const id = stored?.id;
				if (!id) throw new Error("expected stored skill to have an id");

				// When only the name is patched.
				const ok = await updatePrivateSkill(id, { name: "renamed-skill" });

				// Then the update succeeds and the untouched fields keep their original values.
				expect(ok).toBe(true);
				const after = (await findAllPrivateSkills()).find((s) => s.id === id);
				expect(after?.name).toBe("renamed-skill");
				expect(after?.content).toBe("c1");
				expect(after?.description).toBe("d1");
				expect(after?.scopes).toEqual(["work"]);
			} finally {
				await dropTestDatabase();
			}
		});
	});

	it("clears the description when the update sends an empty string", async () => {
		await withTestDatabase(generateTestDatabaseName(), async () => {
			try {
				// Given a stored skill that has a description.
				await storePrivateSkill("claude-code", { name: "desc-clear-skill", content: "c1", description: "had one" }, [
					"work",
				]);
				const stored = (await findAllPrivateSkills()).find((s) => s.name === "desc-clear-skill");
				const id = stored?.id;
				if (!id) throw new Error("expected stored skill to have an id");

				// When the description is explicitly patched to an empty string.
				await updatePrivateSkill(id, { description: "" });

				// Then the stored description is removed.
				const after = (await findAllPrivateSkills()).find((s) => s.id === id);
				expect(after?.description).toBeUndefined();
			} finally {
				await dropTestDatabase();
			}
		});
	});

	it("leaves the description intact when the update omits the key", async () => {
		await withTestDatabase(generateTestDatabaseName(), async () => {
			try {
				// Given a stored skill that has a description.
				await storePrivateSkill("claude-code", { name: "desc-intact-skill", content: "c1", description: "keep me" }, [
					"work",
				]);
				const stored = (await findAllPrivateSkills()).find((s) => s.name === "desc-intact-skill");
				const id = stored?.id;
				if (!id) throw new Error("expected stored skill to have an id");

				// When the update patches an unrelated field and never mentions description.
				await updatePrivateSkill(id, { content: "c2" });

				// Then the stored description is untouched.
				const after = (await findAllPrivateSkills()).find((s) => s.id === id);
				expect(after?.description).toBe("keep me");
			} finally {
				await dropTestDatabase();
			}
		});
	});

	it("returns false when updating a skill id that does not exist", async () => {
		await withTestDatabase(generateTestDatabaseName(), async () => {
			try {
				const ok = await updatePrivateSkill("no-such-id", { name: "x", content: "y", scopes: [] });
				expect(ok).toBe(false);
			} finally {
				await dropTestDatabase();
			}
		});
	});

	it("deletes a private skill by id, reporting false on a second delete", async () => {
		await withTestDatabase(generateTestDatabaseName(), async () => {
			try {
				// Given a stored private skill with a real permanent id.
				await storePrivateSkill("claude-code", { name: "to-delete", content: "c1" }, ["work"]);
				const stored = (await findAllPrivateSkills()).find((s) => s.name === "to-delete");
				const id = stored?.id;
				if (!id) throw new Error("expected stored skill to have an id");

				// When the skill is deleted by id.
				const firstDelete = await deletePrivateSkill(id);

				// Then the deletion reports success and the skill is gone from a re-listing.
				expect(firstDelete).toBe(true);
				const after = (await findAllPrivateSkills()).find((s) => s.id === id);
				expect(after).toBeUndefined();

				// And deleting the same id again reports false (nothing left to remove).
				const secondDelete = await deletePrivateSkill(id);
				expect(secondDelete).toBe(false);
			} finally {
				await dropTestDatabase();
			}
		});
	});
});
