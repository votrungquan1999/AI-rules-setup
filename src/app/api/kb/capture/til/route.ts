import { type NextRequest, NextResponse } from "next/server";
import { insertKbDraft } from "../../../../../server/kb-repository";
import { KbType } from "../../../../../server/types";
import { parseScopeHeader } from "../../../lib/scope-header";
import { verifySecret } from "../../../lib/verify-secret";

interface CaptureTilBody {
	title: string;
	body: string;
	agent?: string;
}

/**
 * POST /api/kb/capture/til
 *
 * Secret-gated (401) capture of a "today I learned" note as a draft KB document. Reads the
 * workspace scope from `x-ai-rules-scope` (CSV → `string[]`); an absent header means an empty
 * scope, stored as a global draft. 400 on malformed JSON or empty title/body. Always inserts as a draft.
 */
export async function POST(request: NextRequest) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const scope = parseScopeHeader(request.headers.get("x-ai-rules-scope"));

	let body: CaptureTilBody;
	try {
		body = (await request.json()) as CaptureTilBody;
	} catch {
		return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
	}

	if (!body.title?.trim() || !body.body?.trim()) {
		return NextResponse.json({ error: "title and body are required" }, { status: 400 });
	}

	const draft: { type: KbType; title: string; body: string; scope: string[]; agent?: string } = {
		type: KbType.Til,
		title: body.title,
		body: body.body,
		scope,
	};
	if (body.agent) draft.agent = body.agent;

	const id = await insertKbDraft(draft);
	return NextResponse.json({ id }, { status: 201 });
}
