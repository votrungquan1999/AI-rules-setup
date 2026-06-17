import { type NextRequest, NextResponse } from "next/server";

/** Name of the httpOnly session cookie set by the `/api/auth` login route. */
const SESSION_COOKIE = "session";

/**
 * Edge proxy (Next.js, formerly "middleware") gating the reviewer web pages (`/kb/*`, `/private-skills/*`).
 *
 * Runs in the Edge runtime, so it CANNOT use `node:crypto`/`timingSafeEqual`. It reads the
 * `session` cookie and compares it to `AI_RULES_SECRET` with plain string equality (edge-safe).
 * On mismatch it redirects to `/login`. The constant-time compare lives in the node-runtime
 * `/api/auth` route, which is what gates issuing the cookie in the first place.
 *
 * `/api/kb/*` is intentionally NOT gated here — those routes self-guard via the
 * `x-ai-rules-secret` header so the MCP machine client keeps working.
 * @param request - The incoming request
 * @returns A redirect to `/login` when the session is missing/invalid, otherwise `NextResponse.next()`
 */
export function proxy(request: NextRequest): NextResponse {
	const configured = process.env.AI_RULES_SECRET;
	const session = request.cookies.get(SESSION_COOKIE)?.value;

	if (configured && session && session === configured) {
		return NextResponse.next();
	}

	const loginUrl = new URL("/login", request.url);
	return NextResponse.redirect(loginUrl);
}

export const config = {
	matcher: ["/kb/:path*", "/private-skills/:path*"],
};
