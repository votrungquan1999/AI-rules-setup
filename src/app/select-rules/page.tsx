import { fetchAllRulesData } from "src/app/api/lib/rules-data-fetcher";
import { ManifestsProvider } from "src/lib/manifests.state";
import { SearchProvider } from "src/lib/search.state";
import { SelectionProvider } from "src/lib/selection.state";
import { SelectRulesPageClient } from "./SelectRulesPageClient";

/**
 * Rule selection page - Server component
 * Fetches rules from MongoDB cache with local filesystem auto-priming
 */
export default async function SelectRulesPage() {
	"use cache";

	const rulesData = await fetchAllRulesData();

	// Flatten rules for easier processing
	const agents = Object.keys(rulesData.agents);
	const defaultAgent = agents[0] || "cursor";

	return (
		<SelectionProvider defaultAgent={defaultAgent}>
			<ManifestsProvider rulesData={rulesData} questions={[]} agents={agents}>
				<SearchProvider>
					<SelectRulesPageClient />
				</SearchProvider>
			</ManifestsProvider>
		</SelectionProvider>
	);
}
