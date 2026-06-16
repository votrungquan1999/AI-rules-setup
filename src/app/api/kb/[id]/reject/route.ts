import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import { rejectKbDoc } from "../../../../../server/kb-repository";
import { verifySecret } from "../../../lib/verify-secret";

/**
 * POST /api/kb/[id]/reject
 *
 * Reviewer-only: permanently deletes a KB document. Secret-gated (401).
 * Returns 400 on an invalid id, 404 when no document matched.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await ctx.params;
	if (!ObjectId.isValid(id)) {
		return NextResponse.json({ error: "Invalid id" }, { status: 400 });
	}

	const rejected = await rejectKbDoc(id);
	if (!rejected) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true }, { status: 200 });
}
