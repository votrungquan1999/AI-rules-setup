import { useMemo } from "react";
import { useSelectedAgent } from "src/lib/selection.state";
import { extractManifestsForAgent } from "src/lib/rules-data-utils";
import type { Manifest, RulesData } from "src/server/types";

/**
 * Hook to get manifests filtered by currently selected agent
 * @param rulesData - Complete rules data for all agents
 * @returns Array of manifests for the currently selected agent
 */
export function useAgentManifests(rulesData: RulesData): Manifest[] {
	const selectedAgent = useSelectedAgent();

	return useMemo(() => {
		return extractManifestsForAgent(rulesData, selectedAgent);
	}, [rulesData, selectedAgent]);
}

