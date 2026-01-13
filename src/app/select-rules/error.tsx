"use client";

import { useEffect } from "react";
import { Button } from "src/components/ui/button";

/**
 * Error boundary component for the select-rules page
 * Handles errors that occur during server-side rendering or data fetching
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		// Log the error to console for debugging
		console.error("Error in select-rules page:", error);
	}, [error]);

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="max-w-7xl mx-auto">
				<h1 className="text-3xl font-bold mb-4 text-foreground">AI Rules Selector</h1>
				<div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
					<p className="text-destructive font-semibold">Failed to fetch rules data</p>
					<p className="text-muted-foreground mt-2">
						{error.message || "Unknown error occurred while fetching rules from GitHub."}
					</p>
					{error.digest && <p className="text-muted-foreground text-sm mt-1">Error ID: {error.digest}</p>}
					<Button onClick={reset} className="mt-4">
						Try again
					</Button>
				</div>
			</div>
		</div>
	);
}
