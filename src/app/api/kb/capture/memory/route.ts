import { type NextRequest, NextResponse } from "next/server";
import { insertKbDraft } from "../../../../../server/kb-repository";
import { KbType } from "../../../../../server/types";
import { parseScopeHeader } from "../../../lib/scope-header";
import { verifySecret } from "../../../lib/verify-secret";

interface CaptureMemoryBody {
	body: string;
	title?: string;
	agent?: string;
}

/** Max characters a memory body may contain (inclusive). */
const MAX_MEMORY_CHARS = 200;
/** Max newline-delimited lines a (trimmed) memory body may contain (inclusive). */
const MAX_MEMORY_LINES = 2;

/**
 * POST /api/kb/capture/memory
 *
 * Secret-gated (401) capture of an always-on memory as a draft KB document. Reads the workspace
 * scope from `x-ai-rules-scope` (CSV → `string[]`); an absent header means an empty scope, stored
 * as a global memory. Enforces a conciseness cap:
 * rejects 400 when the trimmed body exceeds 2 lines OR the body exceeds 200 characters — a memory
 * must be short enough to live in every session. `title` is optional; when absent it is derived
 * from the body's first line. Always inserts as a draft.
 */
export async function POST(request: NextRequest) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const scope = parseScopeHeader(request.headers.get("x-ai-rules-scope"));

	let body: CaptureMemoryBody;
	try {
		body = (await request.json()) as CaptureMemoryBody;
	} catch {
		return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
	}

	if (!body.body?.trim()) {
		return NextResponse.json({ error: "body is required" }, { status: 400 });
	}

	if (body.body.length > MAX_MEMORY_CHARS || body.body.trim().split("\n").length > MAX_MEMORY_LINES) {
		return NextResponse.json(
			{ error: "Memory too long: keep it to at most 2 lines and 200 characters so it can live in every session" },
			{ status: 400 },
		);
	}

	const title = body.title?.trim() ? body.title : (body.body.trim().split("\n")[0] ?? body.body);
	const draft: { type: KbType; title: string; body: string; scope: string[]; agent?: string } = {
		type: KbType.Memory,
		title,
		body: body.body,
		scope,
	};
	if (body.agent) draft.agent = body.agent;

	const id = await insertKbDraft(draft);
	return NextResponse.json({ id }, { status: 201 });
}
