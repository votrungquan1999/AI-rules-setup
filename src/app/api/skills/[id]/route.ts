import { type NextRequest, NextResponse } from "next/server";
import { updatePrivateSkill } from "../../../../server/rules-repository";
import { verifySecret } from "../../lib/verify-secret";

interface PatchRequestBody {
	name?: string;
	content?: string;
	description?: string;
	scopes?: string[];
}

/**
 * PATCH /api/skills/[id]
 *
 * Reviewer-only: edits a private skill's `name`, `content`, `description`, and `scopes`, addressed
 * by its permanent id. The owning agent and other stored data are left intact. Omitting
 * `description` clears it. An empty `scopes` array is valid and means the skill is global.
 * Secret-gated (401). Returns 400 on malformed body, missing name/content, or non-array scopes;
 * 404 when no skill has that id. Note: ids are UUIDs, not Mongo ObjectIds — no ObjectId validation.
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await ctx.params;

	let body: PatchRequestBody;
	try {
		body = (await request.json()) as PatchRequestBody;
	} catch {
		return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
	}

	if (typeof body.name !== "string" || typeof body.content !== "string") {
		return NextResponse.json({ error: "name and content are required" }, { status: 400 });
	}
	if (!Array.isArray(body.scopes)) {
		return NextResponse.json({ error: "scopes must be an array (empty array = global)" }, { status: 400 });
	}

	const fields: { name: string; content: string; scopes: string[]; description?: string } = {
		name: body.name,
		content: body.content,
		scopes: body.scopes,
	};
	// Omitting description (undefined) clears it; the edit dialog sends undefined when the reviewer empties the field.
	if (body.description !== undefined) fields.description = body.description;

	const updated = await updatePrivateSkill(id, fields);
	if (!updated) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true }, { status: 200 });
}
