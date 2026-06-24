import { type NextRequest, NextResponse } from "next/server";
import { insertKbDraft } from "../../../../../server/kb-repository";
import { KbType } from "../../../../../server/types";
import { parseScopeHeader } from "../../../lib/scope-header";
import { verifySecret } from "../../../lib/verify-secret";

interface CaptureQuestionBody {
	title: string;
	problem: string;
	resolution: string;
	agent?: string;
}

/**
 * POST /api/kb/capture/question
 *
 * Secret-gated (401) capture of a solved question as a draft KB document. Reads the workspace
 * scope from the `x-ai-rules-scope` header (CSV → `string[]`); an absent header means an empty
 * scope, which is stored as a global (visible to every workspace) draft.
 * Composes `problem` + `resolution` into a single markdown body and always inserts as a draft.
 * 400 on malformed JSON or empty required fields.
 */
export async function POST(request: NextRequest) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const scope = parseScopeHeader(request.headers.get("x-ai-rules-scope"));

	let body: CaptureQuestionBody;
	try {
		body = (await request.json()) as CaptureQuestionBody;
	} catch {
		return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
	}

	if (!body.title?.trim() || !body.problem?.trim() || !body.resolution?.trim()) {
		return NextResponse.json({ error: "title, problem, and resolution are required" }, { status: 400 });
	}

	const composedBody = `## Problem\n${body.problem}\n\n## Resolution\n${body.resolution}`;
	const draft: { type: KbType; title: string; body: string; scope: string[]; agent?: string } = {
		type: KbType.Question,
		title: body.title,
		body: composedBody,
		scope,
	};
	if (body.agent) draft.agent = body.agent;

	const id = await insertKbDraft(draft);
	return NextResponse.json({ id }, { status: 201 });
}
