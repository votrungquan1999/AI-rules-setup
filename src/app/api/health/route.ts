import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Lightweight health check endpoint for E2E tests
 * Returns quickly without any database or external API calls
 *
 * @returns JSON response indicating server is ready
 */
export async function GET(_request: NextRequest) {
	return NextResponse.json(
		{
			status: "ok",
			timestamp: new Date().toISOString(),
		},
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		},
	);
}
