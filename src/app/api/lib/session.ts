import { timingSafeEqual } from "node:crypto";

/** Name of the httpOnly session cookie. The cookie value is the raw shared secret. */
export const SESSION_COOKIE = "session";

/**
 * Constant-time comparison of a candidate secret against the server's configured `AI_RULES_SECRET`.
 * Used by the login route to verify the posted secret and by server pages to verify the session
 * cookie value. Returns false when the server is unconfigured or lengths differ.
 *
 * NOTE: This runs only in the node runtime (it uses `node:crypto`). The edge proxy uses a
 * plain `===` comparison instead, which is edge-safe.
 * @param candidate - The secret to verify (from request body or session cookie)
 * @returns True when the candidate matches the configured secret
 */
export function verifySessionSecret(candidate: string | undefined): boolean {
	const configured = process.env.AI_RULES_SECRET;
	if (!configured || !candidate) return false;
	const a = Buffer.from(candidate);
	const b = Buffer.from(configured);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
