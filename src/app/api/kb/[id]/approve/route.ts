import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import { approveKbDoc } from "../../../../../server/kb-repository";
import { verifySecret } from "../../../lib/verify-secret";

/**
 * POST /api/kb/[id]/approve
 *
 * Reviewer-only: promotes a draft KB document to canonical. Secret-gated (401).
 * Returns 400 on an invalid id, 404 when no draft matched (missing or already canonical).
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await ctx.params;
	if (!ObjectId.isValid(id)) {
		return NextResponse.json({ error: "Invalid id" }, { status: 400 });
	}

	const approved = await approveKbDoc(id);
	if (!approved) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true }, { status: 200 });
}
