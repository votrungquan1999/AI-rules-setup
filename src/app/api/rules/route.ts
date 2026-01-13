import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { fetchAllRulesData } from "../lib/github-fetcher";

/**
 * GET /api/rules
 *
 * Fetches all available rules from MongoDB cache with GitHub fallback.
 * First attempts to serve from MongoDB, falls back to GitHub if data is missing.
 *
 * @returns JSON response with structured rules data
 */
export async function GET(_request: NextRequest) {
	try {
		console.log("Fetching rules data from MongoDB with GitHub fallback");
		const rulesData = await fetchAllRulesData();

		revalidatePath("/select-rules");

		return NextResponse.json(rulesData, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=300, s-maxage=300", // 5 minutes
			},
		});
	} catch (error) {
		console.error("Error fetching rules data:", error);

		return NextResponse.json(
			{
				error: "Failed to fetch rules data",
				message: error instanceof Error ? error.message : "Unknown error",
				source: "MongoDB cache or GitHub fallback",
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
