const SECRET_HEADER = "x-ai-rules-secret";
const SCOPE_HEADER = "x-ai-rules-scope";

/** Input for capturing a solved question. */
export interface CaptureQuestionInput {
	title: string;
	problem: string;
	resolution: string;
	agent?: string | undefined;
}

/** Input for capturing a TIL or a blueprint (same shape; the route determines the stored type). */
export interface CaptureBodyInput {
	title: string;
	body: string;
	agent?: string | undefined;
}

/** Input for capturing an always-on memory (title is optional; derived server-side from body). */
export interface CaptureMemoryInput {
	body: string;
	title?: string | undefined;
	agent?: string | undefined;
}

/**
 * Thin HTTP client to the `/api/kb/*` routes used by the MCP server. It mirrors the auth
 * conventions of the CLI's `api-client.ts`: the `AI_RULES_SECRET` env var is sent as the
 * `x-ai-rules-secret` header, and the workspace scope list is CSV-encoded into `x-ai-rules-scope`.
 */
export class KbHttpClient {
	private readonly baseUrl: string;
	private readonly scopes: string[];

	/**
	 * @param baseUrl - Base URL of the API server (e.g. https://ai-rules-setup.vercel.app)
	 * @param scopes - The workspace's declared scope tags (CSV-encoded into the scope header)
	 */
	constructor(baseUrl: string, scopes: string[]) {
		this.baseUrl = baseUrl;
		this.scopes = scopes;
	}

	/**
	 * Builds the auth headers: the secret (from `AI_RULES_SECRET`) and, when present, the
	 * CSV-encoded scope. Scope is only sent alongside the secret (scope alone unlocks nothing).
	 * @param includeScope - Whether to attach the `x-ai-rules-scope` header
	 * @returns The header map
	 */
	private authHeaders(includeScope: boolean): Record<string, string> {
		const headers: Record<string, string> = {};
		const secret = process.env.AI_RULES_SECRET;
		if (secret) headers[SECRET_HEADER] = secret;
		if (includeScope && this.scopes.length > 0) headers[SCOPE_HEADER] = this.scopes.join(",");
		return headers;
	}

	/**
	 * Searches canonical KB docs via `GET /api/kb/search`.
	 * @param query - Free-text query (empty returns all in-scope canonical docs)
	 * @param type - Optional type filter (question/til/blueprint/memory)
	 * @returns The raw JSON response body
	 */
	async kbSearch(query: string, type?: string): Promise<unknown> {
		const url = new URL(`${this.baseUrl}/api/kb/search`);
		url.searchParams.set("q", query);
		if (type) url.searchParams.set("type", type);
		const response = await fetch(url.toString(), { headers: this.authHeaders(true) });
		return response.json();
	}

	/**
	 * Fetches a single KB doc by hex id via `GET /api/kb/search?id=<hex>`. Scope is not consulted.
	 * @param id - The document's hex ObjectId
	 * @returns The raw JSON response body
	 */
	async kbGet(id: string): Promise<unknown> {
		const url = new URL(`${this.baseUrl}/api/kb/search`);
		url.searchParams.set("id", id);
		const response = await fetch(url.toString(), { headers: this.authHeaders(false) });
		return response.json();
	}

	/**
	 * POSTs a JSON capture body to a `/api/kb/capture/*` route with secret + scope headers.
	 * @param path - The capture route path (e.g. `/api/kb/capture/question`)
	 * @param body - The JSON request body
	 * @returns The raw JSON response body
	 */
	private async post(path: string, body: unknown): Promise<unknown> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...this.authHeaders(true) },
			body: JSON.stringify(body),
		});
		return response.json();
	}

	/**
	 * Captures a solved question as a draft via `POST /api/kb/capture/question`.
	 * @param input - The question fields (title, problem, resolution, optional agent)
	 * @returns The raw JSON response body (`{ id }` on success)
	 */
	async captureQuestion(input: CaptureQuestionInput): Promise<unknown> {
		return this.post("/api/kb/capture/question", input);
	}

	/**
	 * Captures a TIL learning as a draft via `POST /api/kb/capture/til`.
	 * @param input - The TIL fields (title, body, optional agent)
	 * @returns The raw JSON response body (`{ id }` on success)
	 */
	async captureTil(input: CaptureBodyInput): Promise<unknown> {
		return this.post("/api/kb/capture/til", input);
	}

	/**
	 * Captures a reusable blueprint as a draft via `POST /api/kb/capture/blueprint`.
	 * @param input - The blueprint fields (title, body, optional agent)
	 * @returns The raw JSON response body (`{ id }` on success)
	 */
	async captureBlueprint(input: CaptureBodyInput): Promise<unknown> {
		return this.post("/api/kb/capture/blueprint", input);
	}

	/**
	 * Captures an always-on memory as a draft via `POST /api/kb/capture/memory`.
	 * @param input - The memory fields (body, optional title, optional agent)
	 * @returns The raw JSON response body (`{ id }` on success), or an error body on a 400 cap violation
	 */
	async captureMemory(input: CaptureMemoryInput): Promise<unknown> {
		return this.post("/api/kb/capture/memory", input);
	}
}
