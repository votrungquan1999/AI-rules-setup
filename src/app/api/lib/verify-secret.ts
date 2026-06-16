import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const SECRET_HEADER = "x-ai-rules-secret";

/**
 * Returns true when the request's `x-ai-rules-secret` header matches the server's configured
 * `AI_RULES_SECRET` using a constant-time compare. Returns false when the server is unconfigured
 * or the header is missing/wrong-length.
 *
 * Callers decide what a false result means:
 * - authenticated write/review endpoints respond 401 (the secret IS the gate);
 * - public reads (e.g. /api/rules) fall back to the public payload silently, so a wrong secret
 *   cannot probe for the existence of private content.
 * @param request - The incoming Next.js request
 * @returns True when the provided secret matches; false otherwise
 */
export function verifySecret(request: NextRequest): boolean {
	const configured = process.env.AI_RULES_SECRET;
	if (!configured) return false;
	const provided = request.headers.get(SECRET_HEADER);
	if (!provided) return false;
	const a = Buffer.from(provided);
	const b = Buffer.from(configured);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
