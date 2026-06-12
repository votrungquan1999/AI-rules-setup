import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { storePrivateSkill } from "../../../../server/rules-repository";
import type { SkillFile } from "../../../../server/types";

interface UploadRequestBody {
	agent: string;
	skill: SkillFile;
	scopes: string[];
}

const SECRET_HEADER = "x-ai-rules-secret";

/**
 * Returns true when the request's secret header matches the server's configured secret
 * using a constant-time compare. Returns false when the server is unconfigured or the
 * header is missing/wrong-length.
 */
function verifySecret(request: NextRequest): boolean {
	const configured = process.env.AI_RULES_SECRET;
	if (!configured) return false;
	const provided = request.headers.get(SECRET_HEADER);
	if (!provided) return false;
	const a = Buffer.from(provided);
	const b = Buffer.from(configured);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

/**
 * POST /api/skills/upload
 *
 * Persists a private skill to MongoDB after validating the shared secret header.
 * Rejects with 401 when the secret is missing, wrong, or the server is unconfigured.
 * Rejects with 400 when the body is malformed or `scopes` is empty.
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
	if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
		return NextResponse.json({ error: "At least one scope is required" }, { status: 400 });
	}

	await storePrivateSkill(body.agent, body.skill, body.scopes);
	return NextResponse.json({ success: true }, { status: 200 });
}
