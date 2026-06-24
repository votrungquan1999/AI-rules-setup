import { type NextRequest, NextResponse } from "next/server";
import { approveKbDocs } from "../../../../server/kb-repository";
import { verifySecret } from "../../lib/verify-secret";

interface ApproveAllRequestBody {
	ids: string[];
}

/**
 * POST /api/kb/approve-all
 *
 * Reviewer-only bulk action: promotes the listed draft documents to canonical in a single DB
 * update. Secret-gated (401). The client passes the exact draft ids it is showing (already
 * filtered by the UI), so the server's "all" is auditable and never widens to drafts the
 * reviewer wasn't looking at. Ids that are malformed, missing, or already canonical are silently
 * skipped — only the ids that actually flipped are returned, so the client can update its list
 * deterministically.
 *
 * 400 when the body is malformed or `ids` is not a non-empty array.
 * 200 with `{ approvedIds: string[] }` on success (the array may be empty if no id matched).
 */
export async function POST(request: NextRequest) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: ApproveAllRequestBody;
	try {
		body = (await request.json()) as ApproveAllRequestBody;
	} catch {
		return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
	}
	if (!Array.isArray(body.ids) || body.ids.length === 0) {
		return NextResponse.json({ error: "ids must be a non-empty array of draft ids" }, { status: 400 });
	}

	const approvedIds = await approveKbDocs(body.ids);
	return NextResponse.json({ approvedIds }, { status: 200 });
}
