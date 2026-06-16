import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTestDatabase, seedTestDatabase } from "../helpers/seed-test-database";

const SECRET = "test-secret";

describe("E2E: KB Capture (question/til/blueprint/memory)", () => {
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

	describe("POST /api/kb/capture/question", () => {
		it("creates a draft composing problem and resolution into a single markdown body", async () => {
			// When the agent captures a solved question.
			const response = await fetch(`${apiUrl()}/api/kb/capture/question`, {
				method: "POST",
				headers: {
					"x-ai-rules-secret": SECRET,
					"x-ai-rules-scope": "work",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title: "Why does the build fail?",
					problem: "Missing env var",
					resolution: "Add AI_RULES_SECRET to .env",
				}),
			});
			expect(response.status).toBe(201);

			// Then a draft exists with the exact composed body and draft status.
			const db = await getTestDatabase();
			const stored = await db.collection("kb_docs").findOne({ title: "Why does the build fail?" });
			expect(stored?.status).toBe("draft");
			expect(stored?.type).toBe("question");
			expect(stored?.body).toBe("## Problem\nMissing env var\n\n## Resolution\nAdd AI_RULES_SECRET to .env");
			expect(stored?.scope).toEqual(["work"]);
		});

		it("rejects without the secret (401), without a scope header (400), and with empty fields (400)", async () => {
			const noSecret = await fetch(`${apiUrl()}/api/kb/capture/question`, {
				method: "POST",
				headers: { "x-ai-rules-scope": "work", "Content-Type": "application/json" },
				body: JSON.stringify({ title: "t", problem: "p", resolution: "r" }),
			});
			expect(noSecret.status).toBe(401);

			const noScope = await fetch(`${apiUrl()}/api/kb/capture/question`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET, "Content-Type": "application/json" },
				body: JSON.stringify({ title: "t", problem: "p", resolution: "r" }),
			});
			expect(noScope.status).toBe(400);

			const emptyFields = await fetch(`${apiUrl()}/api/kb/capture/question`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET, "x-ai-rules-scope": "work", "Content-Type": "application/json" },
				body: JSON.stringify({ title: "t", problem: "", resolution: "r" }),
			});
			expect(emptyFields.status).toBe(400);
		});
	});

	describe("POST /api/kb/capture/til", () => {
		it("creates a til draft with the given title and body", async () => {
			const response = await fetch(`${apiUrl()}/api/kb/capture/til`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET, "x-ai-rules-scope": "work", "Content-Type": "application/json" },
				body: JSON.stringify({ title: "TIL Fuse", body: "Fuse.js ranks fuzzy matches" }),
			});
			expect(response.status).toBe(201);

			const db = await getTestDatabase();
			const stored = await db.collection("kb_docs").findOne({ title: "TIL Fuse" });
			expect(stored?.status).toBe("draft");
			expect(stored?.type).toBe("til");
			expect(stored?.body).toBe("Fuse.js ranks fuzzy matches");
		});

		it("rejects an empty body with 400", async () => {
			const response = await fetch(`${apiUrl()}/api/kb/capture/til`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET, "x-ai-rules-scope": "work", "Content-Type": "application/json" },
				body: JSON.stringify({ title: "T", body: "" }),
			});
			expect(response.status).toBe(400);
		});
	});

	describe("POST /api/kb/capture/blueprint", () => {
		it("creates a blueprint draft with the given title and body", async () => {
			const response = await fetch(`${apiUrl()}/api/kb/capture/blueprint`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET, "x-ai-rules-scope": "work", "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Repo pattern", body: "Document type then convert" }),
			});
			expect(response.status).toBe(201);

			const db = await getTestDatabase();
			const stored = await db.collection("kb_docs").findOne({ title: "Repo pattern" });
			expect(stored?.status).toBe("draft");
			expect(stored?.type).toBe("blueprint");
		});
	});

	describe("POST /api/kb/capture/memory", () => {
		it("creates a concise memory draft, deriving the title from the first line when none is given", async () => {
			const response = await fetch(`${apiUrl()}/api/kb/capture/memory`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET, "x-ai-rules-scope": "work", "Content-Type": "application/json" },
				body: JSON.stringify({ body: "Always run tests without watch mode" }),
			});
			expect(response.status).toBe(201);

			const db = await getTestDatabase();
			const stored = await db.collection("kb_docs").findOne({ type: "memory" });
			expect(stored?.status).toBe("draft");
			expect(stored?.body).toBe("Always run tests without watch mode");
			expect(stored?.title).toBe("Always run tests without watch mode");
		});

		it("rejects a memory over 2 lines with 400", async () => {
			const response = await fetch(`${apiUrl()}/api/kb/capture/memory`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET, "x-ai-rules-scope": "work", "Content-Type": "application/json" },
				body: JSON.stringify({ body: "line one\nline two\nline three" }),
			});
			expect(response.status).toBe(400);

			const db = await getTestDatabase();
			expect(await db.collection("kb_docs").findOne({ type: "memory" })).toBeNull();
		});

		it("rejects a memory over 200 characters with 400", async () => {
			const response = await fetch(`${apiUrl()}/api/kb/capture/memory`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET, "x-ai-rules-scope": "work", "Content-Type": "application/json" },
				body: JSON.stringify({ body: "x".repeat(201) }),
			});
			expect(response.status).toBe(400);
		});

		it("accepts a memory at the boundary (exactly 200 chars, 2 lines)", async () => {
			const twoLines = `${"a".repeat(99)}\n${"b".repeat(100)}`; // 99 + 1 newline + 100 = 200 chars, 2 lines
			expect(twoLines.length).toBe(200);
			const response = await fetch(`${apiUrl()}/api/kb/capture/memory`, {
				method: "POST",
				headers: { "x-ai-rules-secret": SECRET, "x-ai-rules-scope": "work", "Content-Type": "application/json" },
				body: JSON.stringify({ body: twoLines }),
			});
			expect(response.status).toBe(201);
		});
	});
});
