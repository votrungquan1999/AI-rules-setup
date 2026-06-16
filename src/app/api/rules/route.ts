import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { fetchAllRulesData } from "../lib/rules-data-fetcher";
import { verifySecret } from "../lib/verify-secret";

const SCOPE_HEADER = "x-ai-rules-scope";

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
		// Silent fallback: verifySecret returning false yields the public payload here, never a 401,
		// so a wrong secret cannot probe for the existence of private skills.
		const secretValid = verifySecret(request);
		// The scope header is CSV-encoded by the CLI; split it back into a list of scope tags.
		const projectScope = (request.headers.get(SCOPE_HEADER) ?? "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const includePrivate = secretValid && projectScope.length > 0;
		const fetchOptions: { includePrivate: boolean; projectScope?: string[] } = { includePrivate };
		if (includePrivate) fetchOptions.projectScope = projectScope;
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
