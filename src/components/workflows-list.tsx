"use client";

import { Checkbox } from "src/components/ui/checkbox";
import { useWorkflows } from "src/lib/manifests.state";
import { useSelectedWorkflowNames, useToggleWorkflowSelection } from "src/lib/selection.state";

/**
 * Reusable component for displaying workflows section
 * Used by Antigravity agent display component
 */
export function WorkflowsList() {
	const workflows = useWorkflows();
	const selectedWorkflowNames = useSelectedWorkflowNames();
	const toggleWorkflowSelection = useToggleWorkflowSelection();

	return (
		<div data-testid="workflows-section" className="space-y-4">
			<h2 className="text-2xl font-semibold text-foreground">Workflows</h2>
			{workflows.length === 0 ? (
				<div className="p-6 text-center text-muted-foreground">No workflows available for this agent.</div>
			) : (
				<div className="flex flex-col gap-3">
					{workflows.map((workflow) => {
						const isSelected = selectedWorkflowNames.has(workflow.name);
						return (
							<div key={workflow.name} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card">
								<div className="mt-1">
									<Checkbox
										checked={isSelected}
										onCheckedChange={() => toggleWorkflowSelection(workflow.name)}
										id={`workflow-${workflow.name}`}
										aria-label={workflow.name}
									/>
								</div>
								<label
									htmlFor={`workflow-${workflow.name}`}
									className="font-semibold text-foreground cursor-pointer flex-1"
								>
									{workflow.name}
								</label>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
