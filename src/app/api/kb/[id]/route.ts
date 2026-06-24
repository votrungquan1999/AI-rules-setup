import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import { updateKbDoc } from "../../../../server/kb-repository";
import { verifySecret } from "../../lib/verify-secret";

interface PatchRequestBody {
	title?: string;
	body?: string;
	scope?: string[];
}

/**
 * PATCH /api/kb/[id]
 *
 * Reviewer-only: edits a doc's `title`, `body`, and/or `scope`. Status is preserved — so this
 * also lets a reviewer retag a canonical memory (e.g. set `scope: []` to make it global)
 * without re-running approve. Secret-gated (401). Returns 400 on invalid id, empty body, or
 * a non-array scope; 404 when no document matched.
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await ctx.params;
	if (!ObjectId.isValid(id)) {
		return NextResponse.json({ error: "Invalid id" }, { status: 400 });
	}

	let body: PatchRequestBody;
	try {
		body = (await request.json()) as PatchRequestBody;
	} catch {
		return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
	}

	if (body.title === undefined && body.body === undefined && body.scope === undefined) {
		return NextResponse.json({ error: "At least one of title, body, or scope is required" }, { status: 400 });
	}
	if (body.scope !== undefined && !Array.isArray(body.scope)) {
		return NextResponse.json({ error: "scope must be an array of strings" }, { status: 400 });
	}

	const fields: PatchRequestBody = {};
	if (body.title !== undefined) fields.title = body.title;
	if (body.body !== undefined) fields.body = body.body;
	if (body.scope !== undefined) fields.scope = body.scope;

	const updated = await updateKbDoc(id, fields);
	if (!updated) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true }, { status: 200 });
}
