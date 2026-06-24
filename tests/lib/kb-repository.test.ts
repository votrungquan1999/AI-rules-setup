import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it } from "vitest";
import { getDatabase } from "../../src/server/database";
import {
	approveKbDoc,
	findCanonicalKbDocs,
	findCanonicalMemories,
	findKbDrafts,
	getKbDoc,
	insertKbDraft,
	rejectKbDoc,
	updateKbDoc,
} from "../../src/server/kb-repository";
import { KB_DOCS_COLLECTION_NAME, KbStatus, KbType, type StoredKbDocDocument } from "../../src/server/types";
import { cleanDatabase, generateTestDatabaseName, withTestDatabase } from "../helpers/database-utils";
import { storeKbDocInTestDatabase } from "../helpers/seed-test-database";

describe("KB Repository", () => {
	const testDbName = generateTestDatabaseName();

	beforeEach(async () => {
		await withTestDatabase(testDbName, async () => {
			await getDatabase().then((db) => db.collection(KB_DOCS_COLLECTION_NAME).deleteMany({}));
			await cleanDatabase();
		});
	});

	it("findKbDrafts - returns only draft documents, not canonical ones", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: one draft and one canonical document.
			const db = await getDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Draft Q",
				body: "draft body",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Canonical Q",
				body: "canonical body",
				scope: ["work"],
			});

			// Act
			const drafts = await findKbDrafts();

			// Assert: exactly the draft comes back, as a client-facing KbDoc (string id, string dates).
			expect(drafts).toHaveLength(1);
			const draft = drafts[0];
			if (!draft) throw new Error("expected a draft");
			expect(draft.title).toBe("Draft Q");
			expect(draft.status).toBe(KbStatus.Draft);
			expect(typeof draft.id).toBe("string");
			expect(typeof draft.createdAt).toBe("string");
		});
	});

	it("findKbDrafts - narrows to a given type when the type filter is provided", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: two drafts of different types.
			const db = await getDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "A question",
				body: "q",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Draft,
				title: "A learning",
				body: "til",
				scope: ["work"],
			});

			// Act: filter to TIL only.
			const tils = await findKbDrafts({ type: KbType.Til });

			// Assert: only the TIL draft comes back.
			expect(tils).toHaveLength(1);
			expect(tils[0]?.title).toBe("A learning");
			expect(tils[0]?.type).toBe(KbType.Til);
		});
	});

	it("findCanonicalKbDocs - returns only canonical docs whose scope intersects, never drafts", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: a canonical doc in scope, a draft in scope, and a canonical doc out of scope.
			const db = await getDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Approved in-scope",
				body: "approved",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Draft in-scope",
				body: "draft",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Approved out-of-scope",
				body: "other",
				scope: ["other"],
			});

			// Act: search the "work" scope.
			const docs = await findCanonicalKbDocs({ scopes: ["work"] });

			// Assert: only the canonical in-scope doc — the draft and the out-of-scope canonical are excluded.
			expect(docs).toHaveLength(1);
			expect(docs[0]?.title).toBe("Approved in-scope");
			expect(docs[0]?.status).toBe(KbStatus.Canonical);
		});
	});

	it("findCanonicalKbDocs - a workspace receives global (empty-scope) docs additively with its own scoped docs", async () => {
		await withTestDatabase(testDbName, async () => {
			// Given: a global canonical doc (no scope), a doc in the "work" scope, and one in "other".
			const db = await getDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Global truth",
				body: "applies everywhere",
				scope: [],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Work scoped",
				body: "work only",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Other scoped",
				body: "other only",
				scope: ["other"],
			});

			// When: a "work" workspace searches.
			const docs = await findCanonicalKbDocs({ scopes: ["work"] });

			// Then: the global doc and the "work" doc are both returned; the "other" doc is excluded.
			const titles = docs.map((d) => d.title).sort();
			expect(titles).toEqual(["Global truth", "Work scoped"]);
		});
	});

	it("findCanonicalKbDocs - a workspace with no scope receives global docs only, never scoped ones", async () => {
		await withTestDatabase(testDbName, async () => {
			// Given: a global canonical doc and a scoped canonical doc.
			const db = await getDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Global truth",
				body: "applies everywhere",
				scope: [],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Work scoped",
				body: "work only",
				scope: ["work"],
			});

			// When: a workspace that declares no scope searches.
			const docs = await findCanonicalKbDocs({ scopes: [] });

			// Then: it receives the global doc only — empty scope means "global", not "all".
			expect(docs.map((d) => d.title)).toEqual(["Global truth"]);
		});
	});

	it("insertKbDraft - persists a draft and getKbDoc retrieves it by id", async () => {
		await withTestDatabase(testDbName, async () => {
			// Act: insert a draft, then fetch it by the returned id.
			const id = await insertKbDraft({
				type: KbType.Blueprint,
				title: "Reusable pattern",
				body: "pattern body",
				scope: ["work"],
				agent: "claude-code",
			});

			const doc = await getKbDoc(id);

			// Assert: round-trips with draft status and the persisted fields.
			expect(doc).not.toBeNull();
			expect(doc?.id).toBe(id);
			expect(doc?.status).toBe(KbStatus.Draft);
			expect(doc?.type).toBe(KbType.Blueprint);
			expect(doc?.title).toBe("Reusable pattern");
			expect(doc?.agent).toBe("claude-code");
		});
	});

	it("approveKbDoc - promotes a draft to canonical and stamps reviewedAt", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: a draft document.
			const db = await getDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Pending",
				body: "b",
				scope: ["work"],
			});

			// Act
			const result = await approveKbDoc(id);

			// Assert: returns true; the doc is now canonical with a reviewedAt timestamp.
			expect(result).toBe(true);
			const stored = await db
				.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME)
				.findOne({ _id: new ObjectId(id) });
			expect(stored?.status).toBe(KbStatus.Canonical);
			expect(stored?.reviewedAt).toBeInstanceOf(Date);
		});
	});

	it("approveKbDoc - returns false when the doc is already canonical (no double-approve)", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: an already-canonical document.
			const db = await getDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Already approved",
				body: "b",
				scope: ["work"],
			});

			// Act
			const result = await approveKbDoc(id);

			// Assert: no draft matched the filter, so nothing was modified.
			expect(result).toBe(false);
		});
	});

	it("rejectKbDoc - deletes the document and returns true; false when it does not exist", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: a draft to reject.
			const db = await getDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "To reject",
				body: "b",
				scope: ["work"],
			});

			// Act + Assert: first reject deletes it (true), second finds nothing (false).
			expect(await rejectKbDoc(id)).toBe(true);
			expect(await getKbDoc(id)).toBeNull();
			expect(await rejectKbDoc(id)).toBe(false);
		});
	});

	it("findCanonicalMemories - returns only canonical memory docs in scope, never drafts/non-memory/out-of-scope", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: a canonical memory in scope, a draft memory in scope, a canonical non-memory in scope,
			// and a canonical memory out of scope.
			const db = await getDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Canonical,
				title: "In-scope memory",
				body: "always run tests without watch mode",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Draft,
				title: "Draft memory",
				body: "pending memory",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Canonical question",
				body: "not a memory",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Canonical,
				title: "Out-of-scope memory",
				body: "other scope",
				scope: ["other"],
			});

			// Act: fetch canonical memories for the "work" scope.
			const memories = await findCanonicalMemories(["work"]);

			// Assert: exactly the canonical in-scope memory — draft, non-memory, and out-of-scope excluded.
			expect(memories).toHaveLength(1);
			expect(memories[0]?.title).toBe("In-scope memory");
			expect(memories[0]?.type).toBe(KbType.Memory);
			expect(memories[0]?.status).toBe(KbStatus.Canonical);
		});
	});

	it("findCanonicalMemories - a global memory loads into a workspace whose tags don't match it", async () => {
		await withTestDatabase(testDbName, async () => {
			// Given: a global memory (no scope) and a memory scoped to "other".
			const db = await getDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Canonical,
				title: "Global memory",
				body: "applies everywhere",
				scope: [],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Canonical,
				title: "Other memory",
				body: "other only",
				scope: ["other"],
			});

			// When: the "work" workspace loads its memories.
			const memories = await findCanonicalMemories(["work"]);

			// Then: the global memory is present; the non-matching scoped one is excluded.
			expect(memories.map((m) => m.title)).toEqual(["Global memory"]);
		});
	});

	it("findCanonicalMemories - a workspace with no scope receives global memories only", async () => {
		await withTestDatabase(testDbName, async () => {
			// Given: a global memory and a scoped memory.
			const db = await getDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Canonical,
				title: "Global memory",
				body: "applies everywhere",
				scope: [],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Canonical,
				title: "Work memory",
				body: "work only",
				scope: ["work"],
			});

			// When: a workspace that declares no scope loads its memories.
			const memories = await findCanonicalMemories([]);

			// Then: it receives the global memory only.
			expect(memories.map((m) => m.title)).toEqual(["Global memory"]);
		});
	});

	it("findCanonicalMemories - does not trim memories (cap effectively infinite)", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: 20 canonical in-scope memories — well past the old 15-cap.
			const db = await getDatabase();
			for (let i = 0; i < 20; i++) {
				await storeKbDocInTestDatabase(db, {
					type: KbType.Memory,
					status: KbStatus.Canonical,
					title: `Memory ${i}`,
					body: `memory body ${i}`,
					scope: ["work"],
				});
			}

			// Act
			const memories = await findCanonicalMemories(["work"]);

			// Assert: every memory is returned — nothing is trimmed away.
			expect(memories).toHaveLength(20);
		});
	});

	it("updateKbDoc - edits title/body but keeps the document in draft status", async () => {
		await withTestDatabase(testDbName, async () => {
			// Arrange: a draft.
			const db = await getDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Old title",
				body: "old body",
				scope: ["work"],
			});

			// Act
			const result = await updateKbDoc(id, { title: "New title" });

			// Assert: returns true; title changed; status still draft (no auto-approve).
			expect(result).toBe(true);
			const doc = await getKbDoc(id);
			expect(doc?.title).toBe("New title");
			expect(doc?.body).toBe("old body");
			expect(doc?.status).toBe(KbStatus.Draft);
		});
	});
});
