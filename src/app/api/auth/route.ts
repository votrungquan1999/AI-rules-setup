import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionSecret } from "../lib/session";

interface AuthBody {
	secret?: unknown;
	action?: unknown;
}

/**
 * POST /api/auth — reviewer login / logout.
 *
 * Login: posts `{ secret }`. The secret is verified with a constant-time compare; on success the
 * server sets an httpOnly `session` cookie whose value IS the secret (the edge middleware compares
 * the cookie to `AI_RULES_SECRET` with plain equality). Wrong/absent secret → 401.
 *
 * Logout: posts `{ action: "logout" }` to clear the session cookie.
 *
 * The `Secure` flag is set only in production so the cookie works over plain HTTP in development.
 * @param request - The incoming login request
 * @returns 200 on successful login/logout; 401 on a bad secret; 400 on malformed JSON
 */
export async function POST(request: NextRequest) {
	let body: AuthBody;
	try {
		body = (await request.json()) as AuthBody;
	} catch {
		return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
	}

	const secure = process.env.NODE_ENV === "production";

	if (body.action === "logout") {
		const response = NextResponse.json({ ok: true }, { status: 200 });
		response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
		return response;
	}

	const secret = typeof body.secret === "string" ? body.secret : undefined;
	if (!verifySessionSecret(secret)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const response = NextResponse.json({ ok: true }, { status: 200 });
	response.cookies.set(SESSION_COOKIE, secret as string, { httpOnly: true, secure, sameSite: "lax", path: "/" });
	return response;
}
