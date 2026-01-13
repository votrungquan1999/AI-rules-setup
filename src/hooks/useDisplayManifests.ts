import { useMemo } from "react";
import { useManifests } from "src/lib/manifests.state";
import { useSearchResults } from "src/lib/search.state";
import type { Manifest } from "src/server/types";

/**
 * Hook to get manifests to display based on search results
 * If there's a search query, returns filtered and scored search results
 * If no search query, returns all manifests for the current agent
 * @returns Array of manifests sorted by search score (if searching) or original order
 */
export function useDisplayManifests(): Manifest[] {
	const manifests = useManifests();
	const searchResults = useSearchResults();

	return useMemo(() => {
		// If no search query (all results have score 0), return all manifests
		const hasSearchQuery = searchResults.some((result) => result.score > 0);

		if (!hasSearchQuery) {
			return manifests;
		}

		// Return search results sorted by score (already sorted by searchRules)
		return searchResults.map((result) => result.manifest);
	}, [manifests, searchResults]);
}
