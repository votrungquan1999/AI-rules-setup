import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { STORAGE_STATE, TEST_SECRET } from "../../playwright.config";

/**
 * Writes the authenticated storage state used by every spec. The `session` cookie value IS the
 * shared secret (the proxy compares it to `AI_RULES_SECRET` with plain equality), so we can author
 * the cookie directly instead of driving the login UI — auth is plumbing here, not under test.
 */
export default async function globalSetup() {
	const state = {
		cookies: [
			{
				name: "session",
				value: TEST_SECRET,
				domain: "localhost",
				path: "/",
				expires: -1,
				httpOnly: true,
				secure: false,
				sameSite: "Lax" as const,
			},
		],
		origins: [],
	};
	await mkdir(dirname(STORAGE_STATE), { recursive: true });
	await writeFile(STORAGE_STATE, JSON.stringify(state, null, 2));
}
