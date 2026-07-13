import { type NextRequest, NextResponse } from "next/server";
import { deletePrivateSkill, updatePrivateSkill } from "../../../../server/rules-repository";
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
 * Reviewer-only: partially edits a private skill's `name`, `content`, `description`, and/or
 * `scopes`, addressed by its permanent id. Any subset of those fields may be sent; fields left out
 * of the body are untouched. The owning agent and other stored data are always left intact.
 * `description` uses key-presence semantics: absent = leave untouched, `""` = clear it, non-empty
 * = set it. An empty `scopes` array is valid and means the skill is global.
 * Secret-gated (401). Returns 400 on malformed body, a body with none of the four editable fields,
 * or a present field of the wrong type; 404 when no skill has that id. Note: ids are UUIDs, not
 * Mongo ObjectIds — no ObjectId validation.
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

	const hasName = "name" in body;
	const hasContent = "content" in body;
	const hasDescription = "description" in body;
	const hasScopes = "scopes" in body;

	if (!hasName && !hasContent && !hasDescription && !hasScopes) {
		return NextResponse.json(
			{ error: "At least one of name, content, description, scopes is required" },
			{
				status: 400,
			},
		);
	}
	if (hasName && typeof body.name !== "string") {
		return NextResponse.json({ error: "name must be a string" }, { status: 400 });
	}
	if (hasContent && typeof body.content !== "string") {
		return NextResponse.json({ error: "content must be a string" }, { status: 400 });
	}
	if (hasDescription && typeof body.description !== "string") {
		return NextResponse.json({ error: "description must be a string" }, { status: 400 });
	}
	if (hasScopes && !Array.isArray(body.scopes)) {
		return NextResponse.json({ error: "scopes must be an array (empty array = global)" }, { status: 400 });
	}

	// Type-narrowed assignment: the 400 guards above already reject a present-but-wrong-type
	// field, so `typeof`/`Array.isArray` here is equivalent to `hasX` while satisfying
	// exactOptionalPropertyTypes (an absent key stays absent, `""` still flows through to clear).
	const fields: { name?: string; content?: string; description?: string; scopes?: string[] } = {};
	if (typeof body.name === "string") fields.name = body.name;
	if (typeof body.content === "string") fields.content = body.content;
	if (typeof body.description === "string") fields.description = body.description;
	if (Array.isArray(body.scopes)) fields.scopes = body.scopes;

	const updated = await updatePrivateSkill(id, fields);
	if (!updated) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true }, { status: 200 });
}

/**
 * DELETE /api/skills/[id]
 *
 * Reviewer-only: permanently removes a private skill by its permanent id.
 * Secret-gated (401). Returns 404 when no skill has that id. Note: ids are UUIDs, not
 * Mongo ObjectIds — no ObjectId validation (matches the `PATCH` handler's precedent).
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await ctx.params;
	const deleted = await deletePrivateSkill(id);
	if (!deleted) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true }, { status: 200 });
}
