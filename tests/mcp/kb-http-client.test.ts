import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KbHttpClient } from "../../src/mcp/kb-http-client";

interface CapturedRequest {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: unknown;
}

describe("KbHttpClient request shaping", () => {
	let captured: CapturedRequest | null;
	const originalFetch = global.fetch;
	const originalSecret = process.env.AI_RULES_SECRET;

	beforeEach(() => {
		captured = null;
		process.env.AI_RULES_SECRET = "test-secret";
		global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			captured = {
				url: typeof input === "string" ? input : input.toString(),
				method: init?.method ?? "GET",
				headers: (init?.headers ?? {}) as Record<string, string>,
				body: init?.body ? JSON.parse(init.body as string) : undefined,
			};
			return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
		}) as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		if (originalSecret === undefined) delete process.env.AI_RULES_SECRET;
		else process.env.AI_RULES_SECRET = originalSecret;
	});

	it("kbSearch issues a GET to /api/kb/search with q, type, the secret header, and CSV-encoded scope", async () => {
		// Given a client configured with a base URL and a multi-element workspace scope.
		const client = new KbHttpClient("https://api.example.com", ["work", "client-x"]);

		// When the agent searches.
		await client.kbSearch("auth bug", "question");

		// Then the request targets the search route with q and type query params.
		if (!captured) throw new Error("fetch was not called");
		const url = new URL(captured.url);
		expect(url.origin + url.pathname).toBe("https://api.example.com/api/kb/search");
		expect(url.searchParams.get("q")).toBe("auth bug");
		expect(url.searchParams.get("type")).toBe("question");
		expect(captured.method).toBe("GET");

		// And the secret + CSV-encoded scope headers are attached.
		expect(captured.headers["x-ai-rules-secret"]).toBe("test-secret");
		expect(captured.headers["x-ai-rules-scope"]).toBe("work,client-x");
	});

	it("kbGet issues a GET to /api/kb/search?id=<hex> with the secret but NO scope header", async () => {
		// Given a client with a scope (which must NOT be forwarded for get-by-id per the contract).
		const client = new KbHttpClient("https://api.example.com", ["work"]);

		// When the agent fetches a doc by id.
		await client.kbGet("507f1f77bcf86cd799439011");

		// Then the request targets the search route with the id param and the secret header.
		if (!captured) throw new Error("fetch was not called");
		const url = new URL(captured.url);
		expect(url.origin + url.pathname).toBe("https://api.example.com/api/kb/search");
		expect(url.searchParams.get("id")).toBe("507f1f77bcf86cd799439011");
		expect(captured.method).toBe("GET");
		expect(captured.headers["x-ai-rules-secret"]).toBe("test-secret");

		// And the scope header is NOT attached (get-by-id does not consult scope).
		expect(captured.headers["x-ai-rules-scope"]).toBeUndefined();
	});

	it("captureQuestion POSTs JSON to /api/kb/capture/question with secret, scope, and the question fields", async () => {
		// Given a client with a workspace scope.
		const client = new KbHttpClient("https://api.example.com", ["work"]);

		// When the agent captures a solved question.
		await client.captureQuestion({
			title: "Why did the build fail?",
			problem: "Missing env var",
			resolution: "Added AI_RULES_SECRET",
			agent: "claude-code",
		});

		// Then it POSTs JSON to the question capture route with all fields in the body.
		if (!captured) throw new Error("fetch was not called");
		expect(captured.url).toBe("https://api.example.com/api/kb/capture/question");
		expect(captured.method).toBe("POST");
		expect(captured.headers["x-ai-rules-secret"]).toBe("test-secret");
		expect(captured.headers["x-ai-rules-scope"]).toBe("work");
		expect(captured.headers["Content-Type"]).toBe("application/json");
		expect(captured.body).toEqual({
			title: "Why did the build fail?",
			problem: "Missing env var",
			resolution: "Added AI_RULES_SECRET",
			agent: "claude-code",
		});
	});

	it("captureTil POSTs to /api/kb/capture/til with the title/body fields", async () => {
		const client = new KbHttpClient("https://api.example.com", ["work"]);
		await client.captureTil({ title: "Use --run for vitest", body: "Watch mode hangs in CI" });

		if (!captured) throw new Error("fetch was not called");
		expect(captured.url).toBe("https://api.example.com/api/kb/capture/til");
		expect(captured.method).toBe("POST");
		expect(captured.headers["x-ai-rules-scope"]).toBe("work");
		expect(captured.body).toEqual({ title: "Use --run for vitest", body: "Watch mode hangs in CI" });
	});

	it("captureBlueprint POSTs to /api/kb/capture/blueprint with the title/body fields", async () => {
		const client = new KbHttpClient("https://api.example.com", ["work"]);
		await client.captureBlueprint({ title: "Repository pattern", body: "Separate Document from client type" });

		if (!captured) throw new Error("fetch was not called");
		expect(captured.url).toBe("https://api.example.com/api/kb/capture/blueprint");
		expect(captured.method).toBe("POST");
		expect(captured.body).toEqual({ title: "Repository pattern", body: "Separate Document from client type" });
	});

	it("captureMemory POSTs to /api/kb/capture/memory with the body (title optional)", async () => {
		const client = new KbHttpClient("https://api.example.com", ["work"]);
		await client.captureMemory({ body: "Always run tests without watch mode" });

		if (!captured) throw new Error("fetch was not called");
		expect(captured.url).toBe("https://api.example.com/api/kb/capture/memory");
		expect(captured.method).toBe("POST");
		expect(captured.body).toEqual({ body: "Always run tests without watch mode" });
	});
});
