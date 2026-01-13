"use client";

import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select";
import { useAgents } from "src/lib/manifests.state";
import { useClearSelections, useSelectedAgent, useSetAgent } from "src/lib/selection.state";

/**
 * Agent selection dropdown component using shadcn Select
 * Clears selections when agent changes
 * Gets agents from ManifestsProvider context
 */
export function AgentSelector() {
	const agents = useAgents();
	const selectId = useId();
	const selectedAgent = useSelectedAgent();
	const setAgent = useSetAgent();
	const clearSelections = useClearSelections();

	/**
	 * Handles agent change and clears selections
	 */
	const handleAgentChange = (newAgent: string) => {
		if (newAgent !== selectedAgent) {
			setAgent(newAgent);
			clearSelections(); // Clear selections when switching agents
		}
	};

	return (
		<div className="flex items-center gap-3">
			<label htmlFor={selectId} className="text-sm font-medium text-foreground">
				AI Agent:
			</label>
			<Select value={selectedAgent} onValueChange={handleAgentChange}>
				<SelectTrigger id={selectId} className="w-[180px]">
					<SelectValue placeholder="Select agent" />
				</SelectTrigger>
				<SelectContent>
					{agents.map((agent) => (
						<SelectItem key={agent} value={agent}>
							{agent}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
