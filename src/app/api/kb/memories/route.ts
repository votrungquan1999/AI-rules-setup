import { type NextRequest, NextResponse } from "next/server";
import { findCanonicalMemories } from "../../../../server/kb-repository";
import { parseScopeHeader } from "../../lib/scope-header";
import { verifySecret } from "../../lib/verify-secret";

/**
 * GET /api/kb/memories
 *
 * Secret-gated (401 on failure) endpoint returning the workspace's canonical memory documents.
 * Reads the scope from the `x-ai-rules-scope` header (CSV → `string[]`); an absent/blank scope
 * yields an empty array (200, not 400) so the CLI never crashes when no scope is configured.
 * The per-scope cap is enforced inside `findCanonicalMemories`.
 */
export async function GET(request: NextRequest) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const scopes = parseScopeHeader(request.headers.get("x-ai-rules-scope"));
	const memories = await findCanonicalMemories(scopes);
	return NextResponse.json(memories, { status: 200 });
}
