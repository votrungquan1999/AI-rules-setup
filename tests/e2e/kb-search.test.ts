import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KbStatus, KbType } from "../../src/server/types";
import { getTestDatabase, seedTestDatabase, storeKbDocInTestDatabase } from "../helpers/seed-test-database";

interface KbSearchResultResponse {
	doc: { id: string; title: string; type: string };
	score: number;
}

interface KbDocResponse {
	id: string;
	title: string;
	body: string;
	type: string;
}

const SECRET = "test-secret";

describe("E2E: KB Search + Get (GET /api/kb/search)", () => {
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

	it("rejects a request without the secret with 401", async () => {
		const response = await fetch(`${apiUrl()}/api/kb/search?q=anything`, {
			headers: { "x-ai-rules-scope": "work" },
		});
		expect(response.status).toBe(401);
	});

	it("ranks canonical in-scope docs by relevancy, excluding drafts and out-of-scope docs", async () => {
		// Given a strongly-matching canonical doc, a weakly-matching one, a draft, and an out-of-scope canonical.
		const db = await getTestDatabase();
		await storeKbDocInTestDatabase(db, {
			type: KbType.Question,
			status: KbStatus.Canonical,
			title: "Fixing database connection timeout",
			body: "database pool timeout retries",
			scope: ["work"],
		});
		await storeKbDocInTestDatabase(db, {
			type: KbType.Question,
			status: KbStatus.Canonical,
			title: "Deploying containers",
			body: "kubernetes pods",
			scope: ["work"],
		});
		await storeKbDocInTestDatabase(db, {
			type: KbType.Question,
			status: KbStatus.Draft,
			title: "Draft about database timeout",
			body: "database timeout draft",
			scope: ["work"],
		});
		await storeKbDocInTestDatabase(db, {
			type: KbType.Question,
			status: KbStatus.Canonical,
			title: "database timeout elsewhere",
			body: "database timeout",
			scope: ["other"],
		});

		// When the agent searches the "work" scope.
		const response = await fetch(`${apiUrl()}/api/kb/search?q=database+timeout`, {
			headers: { "x-ai-rules-secret": SECRET, "x-ai-rules-scope": "work" },
		});
		expect(response.status).toBe(200);
		const results = (await response.json()) as KbSearchResultResponse[];

		// Then the strongest in-scope canonical match ranks first; drafts and out-of-scope docs never appear.
		const titles = results.map((r) => r.doc.title);
		expect(results[0]?.doc.title).toBe("Fixing database connection timeout");
		expect(titles).not.toContain("Draft about database timeout");
		expect(titles).not.toContain("database timeout elsewhere");
	});

	it("returns a single canonical doc by id via ?id=", async () => {
		const db = await getTestDatabase();
		const id = await storeKbDocInTestDatabase(db, {
			type: KbType.Til,
			status: KbStatus.Canonical,
			title: "A learning",
			body: "learning body",
			scope: ["work"],
		});

		const response = await fetch(`${apiUrl()}/api/kb/search?id=${id}`, {
			headers: { "x-ai-rules-secret": SECRET },
		});
		expect(response.status).toBe(200);
		const doc = (await response.json()) as KbDocResponse;
		expect(doc.id).toBe(id);
		expect(doc.title).toBe("A learning");
		expect(doc.body).toBe("learning body");
	});

	it("returns 404 for ?id= of a non-existent doc and 400 for a malformed id", async () => {
		const missing = await fetch(`${apiUrl()}/api/kb/search?id=000000000000000000000000`, {
			headers: { "x-ai-rules-secret": SECRET },
		});
		expect(missing.status).toBe(404);

		const malformed = await fetch(`${apiUrl()}/api/kb/search?id=not-a-valid-id`, {
			headers: { "x-ai-rules-secret": SECRET },
		});
		expect(malformed.status).toBe(400);
	});
});
