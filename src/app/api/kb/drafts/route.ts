import { type NextRequest, NextResponse } from "next/server";
import { findKbDrafts } from "../../../../server/kb-repository";
import { KbType } from "../../../../server/types";
import { verifySecret } from "../../lib/verify-secret";

/**
 * Narrows a raw query-string value to a valid `KbType`, or undefined when absent/invalid.
 * @param value - The raw `?type=` query value
 * @returns The matching KbType, or undefined for "no type filter"
 */
function parseType(value: string | null): KbType | undefined {
	if (!value) return undefined;
	const match = Object.values(KbType).find((t) => t === value);
	return match as KbType | undefined;
}

/**
 * GET /api/kb/drafts
 *
 * Reviewer-only endpoint listing KB documents awaiting review. Secret-gated (401 on failure).
 * Optional `?type=` and `?scope=` narrow the list. Returns `KbDoc[]`.
 */
export async function GET(request: NextRequest) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const type = parseType(searchParams.get("type"));
	const scope = searchParams.get("scope") || undefined;

	const options: { type?: KbType; scope?: string } = {};
	if (type) options.type = type;
	if (scope) options.scope = scope;

	const drafts = await findKbDrafts(options);
	return NextResponse.json(drafts, { status: 200 });
}
