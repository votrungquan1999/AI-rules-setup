import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KbStatus, KbType } from "../../src/server/types";
import { getTestDatabase, seedTestDatabase, storeKbDocInTestDatabase } from "../helpers/seed-test-database";

interface KbDocResponse {
	id: string;
	type: string;
	status: string;
	title: string;
	body: string;
	scope: string[];
}

const SECRET = "test-secret";

describe("E2E: KB Review (drafts + approve/reject/edit)", () => {
	beforeEach(async () => {
		await seedTestDatabase();
	});

	afterEach(async () => {
		const db = await getTestDatabase();
		await db.collection("kb_docs").deleteMany({});
	});

	function apiUrl(): string {
		const url = process.env.AI_RULES_API_URL;
		if (!url) throw new Error("AI_RULES_API_URL not set by E2E setup");
		return url;
	}

	describe("GET /api/kb/drafts", () => {
		it("rejects a request without the secret with 401", async () => {
			const response = await fetch(`${apiUrl()}/api/kb/drafts`);
			expect(response.status).toBe(401);
		});

		it("returns drafts (not canonical docs) for a reviewer, narrowed by type", async () => {
			// Given a draft question, a draft til, and a canonical question.
			const db = await getTestDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Draft Q",
				body: "q",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Draft,
				title: "Draft TIL",
				body: "t",
				scope: ["work"],
			});
			await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Canonical Q",
				body: "c",
				scope: ["work"],
			});

			// When the reviewer lists all drafts.
			const all = await fetch(`${apiUrl()}/api/kb/drafts`, { headers: { "x-ai-rules-secret": SECRET } });
			expect(all.status).toBe(200);
			const allDrafts = (await all.json()) as KbDocResponse[];
			// Then both drafts are present, the canonical one is not.
			const titles = allDrafts.map((d) => d.title);
			expect(titles).toContain("Draft Q");
			expect(titles).toContain("Draft TIL");
			expect(titles).not.toContain("Canonical Q");

			// And when narrowed by type=til, only the TIL draft comes back.
			const tilOnly = await fetch(`${apiUrl()}/api/kb/drafts?type=til`, {
				headers: { "x-ai-rules-secret": SECRET },
			});
			const tilDrafts = (await tilOnly.json()) as KbDocResponse[];
			expect(tilDrafts.map((d) => d.title)).toEqual(["Draft TIL"]);
		});
	});

	describe("POST /api/kb/[id]/approve", () => {
		it("rejects without the secret (401) and rejects an invalid id (400)", async () => {
			const noSecret = await fetch(`${apiUrl()}/api/kb/000000000000000000000000/approve`, { method: "POST" });
			expect(noSecret.status).toBe(401);

			const badId = await fetch(`${apiUrl()}/api/kb/not-a-valid-id/approve`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET },
			});
			expect(badId.status).toBe(400);
		});

		it("promotes a draft to canonical so it is no longer listed as a draft", async () => {
			// Given a draft.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Approve me",
				body: "b",
				scope: ["work"],
			});

			// When the reviewer approves it.
			const approve = await fetch(`${apiUrl()}/api/kb/${id}/approve`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET },
			});
			expect(approve.status).toBe(200);

			// Then it is canonical in the DB and no longer in the drafts list.
			const stored = await db.collection("kb_docs").findOne({ title: "Approve me" });
			expect(stored?.status).toBe("canonical");

			const drafts = await fetch(`${apiUrl()}/api/kb/drafts`, { headers: { "x-ai-rules-secret": SECRET } });
			const list = (await drafts.json()) as KbDocResponse[];
			expect(list.find((d) => d.id === id)).toBeUndefined();
		});

		it("accepts the session cookie in place of the secret header (in-browser reviewer flow)", async () => {
			// Given a draft.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Approve via cookie",
				body: "b",
				scope: ["work"],
			});

			// When the reviewer approves it carrying ONLY the session cookie (no x-ai-rules-secret
			// header) — this is how the in-browser Approve button POSTs, since the cookie is httpOnly
			// and the client cannot read it to attach as a header.
			const response = await fetch(`${apiUrl()}/api/kb/${id}/approve`, {
				method: "POST",
				headers: { cookie: `session=${SECRET}` },
			});
			expect(response.status).toBe(200);

			// Then the draft is promoted to canonical.
			const stored = await db.collection("kb_docs").findOne({ title: "Approve via cookie" });
			expect(stored?.status).toBe("canonical");
		});

		it("returns 404 when approving a document that is already canonical", async () => {
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Canonical,
				title: "Already canonical",
				body: "b",
				scope: ["work"],
			});
			const response = await fetch(`${apiUrl()}/api/kb/${id}/approve`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET },
			});
			expect(response.status).toBe(404);
		});
	});

	describe("POST /api/kb/[id]/reject", () => {
		it("deletes the document; a second reject returns 404", async () => {
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Reject me",
				body: "b",
				scope: ["work"],
			});

			const first = await fetch(`${apiUrl()}/api/kb/${id}/reject`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET },
			});
			expect(first.status).toBe(200);
			expect(await db.collection("kb_docs").findOne({ title: "Reject me" })).toBeNull();

			const second = await fetch(`${apiUrl()}/api/kb/${id}/reject`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET },
			});
			expect(second.status).toBe(404);
		});
	});

	describe("PATCH /api/kb/[id]", () => {
		it("edits the title while keeping the document in draft status", async () => {
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Old",
				body: "b",
				scope: ["work"],
			});

			const response = await fetch(`${apiUrl()}/api/kb/${id}`, {
				method: "PATCH",
				headers: { "x-ai-rules-secret": SECRET, "Content-Type": "application/json" },
				body: JSON.stringify({ title: "New" }),
			});
			expect(response.status).toBe(200);

			const stored = await db.collection("kb_docs").findOne({ _id: ObjectId.createFromHexString(id) });
			expect(stored?.title).toBe("New");
			expect(stored?.status).toBe("draft");
		});

		it("returns 400 when the body has neither title nor body", async () => {
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Question,
				status: KbStatus.Draft,
				title: "Has fields",
				body: "b",
				scope: ["work"],
			});
			const response = await fetch(`${apiUrl()}/api/kb/${id}`, {
				method: "PATCH",
				headers: { "x-ai-rules-secret": SECRET, "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			expect(response.status).toBe(400);
		});
	});
});
