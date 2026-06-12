import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { fetchAllRulesData } from "../lib/rules-data-fetcher";

const SECRET_HEADER = "x-ai-rules-secret";
const SCOPE_HEADER = "x-ai-rules-scope";

/**
 * Returns true when the request's secret header matches the server's configured secret.
 * Uses a constant-time compare. Silently returns false on any failure (unconfigured server,
 * missing header, wrong length) so callers see the public payload — wrong secrets must NEVER
 * leak the existence of private skills.
 */
function isValidSecret(request: NextRequest): boolean {
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
 * GET /api/rules
 *
 * Fetches all available rules from MongoDB cache with local filesystem auto-priming.
 * Includes private skills when BOTH a valid `x-ai-rules-secret` header AND a non-empty
 * `x-ai-rules-scope` header are present. Otherwise returns public-only — silently, on any
 * auth/scope failure, so wrong secrets cannot probe for private skill existence.
 *
 * @returns JSON response with structured rules data
 */
export async function GET(request: NextRequest) {
	try {
		console.log("Fetching rules data from MongoDB cache with local filesystem auto-priming");
		const secretValid = isValidSecret(request);
		const projectScope = request.headers.get(SCOPE_HEADER)?.trim();
		const includePrivate = secretValid && Boolean(projectScope);
		const fetchOptions: { includePrivate: boolean; projectScope?: string } = { includePrivate };
		if (includePrivate && projectScope) fetchOptions.projectScope = projectScope;
		const rulesData = await fetchAllRulesData(fetchOptions);

		revalidatePath("/select-rules");

		// no CDN caching: private payloads vary by secret + scope header and must never be shared.
		return NextResponse.json(rulesData, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		console.error("Error fetching rules data:", error);

		return NextResponse.json(
			{
				error: "Failed to fetch rules data",
				message: error instanceof Error ? error.message : "Unknown error",
				source: "MongoDB cache or local filesystem",
			},
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
}
