import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "./session";

const SECRET_HEADER = "x-ai-rules-secret";

/**
 * Constant-time compare of a candidate value against `AI_RULES_SECRET`. Returns false when
 * the server is unconfigured, the candidate is missing, or lengths differ.
 */
function matchesConfiguredSecret(candidate: string | undefined): boolean {
	const configured = process.env.AI_RULES_SECRET;
	if (!configured || !candidate) return false;
	const a = Buffer.from(candidate);
	const b = Buffer.from(configured);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

/**
 * Returns true when the request carries the shared secret via EITHER the `x-ai-rules-secret`
 * header (CLI / external callers) OR the `session` httpOnly cookie set by the login route
 * (in-browser reviewer actions). Both paths compare in constant time against `AI_RULES_SECRET`;
 * either presence alone is sufficient.
 *
 * Callers decide what a false result means:
 * - authenticated write/review endpoints respond 401 (the secret IS the gate);
 * - public reads (e.g. /api/rules) fall back to the public payload silently, so a wrong secret
 *   cannot probe for the existence of private content.
 * @param request - The incoming Next.js request
 * @returns True when either the header or the session cookie matches; false otherwise
 */
export function verifySecret(request: NextRequest): boolean {
	const header = request.headers.get(SECRET_HEADER) ?? undefined;
	if (matchesConfiguredSecret(header)) return true;
	const cookie = request.cookies.get(SESSION_COOKIE)?.value;
	return matchesConfiguredSecret(cookie);
}
