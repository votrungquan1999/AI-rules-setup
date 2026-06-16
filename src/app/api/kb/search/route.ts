import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import { searchKbDocs } from "../../../../lib/kb-search";
import { findCanonicalKbDocs, getKbDoc } from "../../../../server/kb-repository";
import { KbType } from "../../../../server/types";
import { parseScopeHeader } from "../../lib/scope-header";
import { verifySecret } from "../../lib/verify-secret";

/**
 * Narrows a raw query-string value to a valid `KbType`, or undefined when absent/invalid.
 * @param value - The raw `?type=` query value
 * @returns The matching KbType, or undefined for "no type filter"
 */
function parseType(value: string | null): KbType | undefined {
	if (!value) return undefined;
	return Object.values(KbType).find((t) => t === value);
}

/**
 * GET /api/kb/search
 *
 * Secret-gated (401 on failure) read endpoint serving two shapes:
 * - `?id=<hex>` — returns the single canonical/draft `KbDoc` (the "get" half), or 404.
 * - `?q=<query>&type=<type>` — ranks canonical docs whose scope intersects the
 *   `x-ai-rules-scope` header (CSV), returning `{ doc, score }[]` sorted by relevancy.
 *
 * The scope header is required for search (no scope → empty result set).
 */
export async function GET(request: NextRequest) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);

	const id = searchParams.get("id");
	if (id) {
		if (!ObjectId.isValid(id)) {
			return NextResponse.json({ error: "Invalid id" }, { status: 400 });
		}
		const doc = await getKbDoc(id);
		if (!doc) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return NextResponse.json(doc, { status: 200 });
	}

	const scopes = parseScopeHeader(request.headers.get("x-ai-rules-scope"));
	const type = parseType(searchParams.get("type"));
	const query = searchParams.get("q") ?? "";

	const options: { scopes: string[]; type?: KbType } = { scopes };
	if (type) options.type = type;
	const canonical = await findCanonicalKbDocs(options);

	const results = searchKbDocs(query, canonical);
	return NextResponse.json(results, { status: 200 });
}
