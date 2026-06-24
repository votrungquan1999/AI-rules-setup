import { type NextRequest, NextResponse } from "next/server";
import { storePrivateSkill } from "../../../../server/rules-repository";
import type { SkillFile } from "../../../../server/types";
import { verifySecret } from "../../lib/verify-secret";

interface UploadRequestBody {
	agent: string;
	skill: SkillFile;
	scopes: string[];
}

/**
 * POST /api/skills/upload
 *
 * Persists a private skill to MongoDB after validating the shared secret header.
 * Rejects with 401 when the secret is missing, wrong, or the server is unconfigured.
 * Rejects with 400 when the body is malformed. An empty `scopes` array is accepted and means
 * the skill is global (visible to every workspace).
 */
export async function POST(request: NextRequest) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: UploadRequestBody;
	try {
		body = (await request.json()) as UploadRequestBody;
	} catch {
		return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
	}
	if (!body.agent || !body.skill?.name || !body.skill.content) {
		return NextResponse.json({ error: "Missing required fields: agent, skill.name, skill.content" }, { status: 400 });
	}
	if (!Array.isArray(body.scopes)) {
		return NextResponse.json({ error: "scopes must be an array (empty array = global)" }, { status: 400 });
	}

	await storePrivateSkill(body.agent, body.skill, body.scopes);
	return NextResponse.json({ success: true }, { status: 200 });
}
