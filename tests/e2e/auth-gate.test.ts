import { describe, expect, it } from "vitest";

const SECRET = "test-secret";

/**
 * E2E auth gate tests. The proxy (edge) gates the web pages `/kb/*` and `/private-skills/*`,
 * redirecting unauthenticated requests to `/login`. The `/api/auth` route (node) verifies the
 * secret and sets the httpOnly `session` cookie. These are HTTP-level (no browser), using `fetch`
 * with redirect handling disabled so we can inspect the redirect Location.
 */
describe("E2E: Auth gate (proxy + login route)", () => {
	function apiUrl(): string {
		const url = process.env.AI_RULES_API_URL;
		if (!url) throw new Error("AI_RULES_API_URL not set by E2E setup");
		return url;
	}

	it("redirects an unauthenticated request to /kb/review to /login", async () => {
		const response = await fetch(`${apiUrl()}/kb/review`, { redirect: "manual" });
		expect(response.status).toBe(307);
		const location = response.headers.get("location") ?? "";
		expect(location).toContain("/login");
	});

	it("POST /api/auth with the correct secret sets a session cookie that unlocks /kb/review", async () => {
		// When the reviewer logs in with the correct secret.
		const login = await fetch(`${apiUrl()}/api/auth`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ secret: SECRET }),
		});
		expect(login.status).toBe(200);
		const setCookie = login.headers.get("set-cookie") ?? "";
		expect(setCookie).toContain("session=");

		// Then presenting that session cookie lets them reach the page (no redirect).
		const cookieValue = `session=${SECRET}`;
		const page = await fetch(`${apiUrl()}/kb/review`, {
			headers: { cookie: cookieValue },
			redirect: "manual",
		});
		expect(page.status).toBe(200);
	});

	it("redirects an unauthenticated request to /private-skills to /login", async () => {
		const response = await fetch(`${apiUrl()}/private-skills`, { redirect: "manual" });
		expect(response.status).toBe(307);
		expect(response.headers.get("location") ?? "").toContain("/login");
	});

	it("POST /api/auth with the wrong secret returns 401 and sets no session cookie", async () => {
		const login = await fetch(`${apiUrl()}/api/auth`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ secret: "wrong-secret" }),
		});
		expect(login.status).toBe(401);
		expect(login.headers.get("set-cookie")).toBeNull();
	});
});
