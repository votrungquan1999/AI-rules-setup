import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import { updateKbDoc } from "../../../../server/kb-repository";
import { verifySecret } from "../../lib/verify-secret";

interface PatchRequestBody {
	title?: string;
	body?: string;
}

/**
 * PATCH /api/kb/[id]
 *
 * Reviewer-only: edits a draft's `title` and/or `body`, keeping it in draft status
 * (does NOT auto-approve). Secret-gated (401). Returns 400 on invalid id or empty body,
 * 404 when no document matched.
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

	if (body.title === undefined && body.body === undefined) {
		return NextResponse.json({ error: "At least one of title or body is required" }, { status: 400 });
	}

	const fields: PatchRequestBody = {};
	if (body.title !== undefined) fields.title = body.title;
	if (body.body !== undefined) fields.body = body.body;

	const updated = await updateKbDoc(id, fields);
	if (!updated) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true }, { status: 200 });
}
