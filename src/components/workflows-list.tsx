"use client";

import * as React from "react";
import { Checkbox } from "src/components/ui/checkbox";
import { useWorkflows } from "src/lib/manifests.state";
import { useSelectedWorkflowNames, useSetSelectedWorkflows, useToggleWorkflowSelection } from "src/lib/selection.state";

/**
 * Reusable component for displaying workflows section
 * Used by Antigravity agent display component
 */
export function WorkflowsList() {
	const workflows = useWorkflows();
	const selectedWorkflowNames = useSelectedWorkflowNames();
	const toggleWorkflowSelection = useToggleWorkflowSelection();
	const setSelectedWorkflows = useSetSelectedWorkflows();

	const allWorkflowNames = workflows.map((w) => w.name);
	const isAllSelected = workflows.length > 0 && selectedWorkflowNames.size === workflows.length;
	const isIndeterminate = selectedWorkflowNames.size > 0 && selectedWorkflowNames.size < workflows.length;

	const selectAllId = React.useId();

	const handleMasterToggle = () => {
		if (isAllSelected) {
			setSelectedWorkflows([]);
		} else {
			setSelectedWorkflows(allWorkflowNames);
		}
	};

	return (
		<div data-testid="workflows-section" className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-semibold text-foreground">Workflows</h2>
				{workflows.length > 0 && (
					<label
						htmlFor={selectAllId}
						className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground"
					>
						<Checkbox
							id={selectAllId}
							checked={isAllSelected}
							onCheckedChange={handleMasterToggle}
							data-state={isIndeterminate ? "indeterminate" : isAllSelected ? "checked" : "unchecked"}
							aria-label="Select all workflows"
						/>
						Select All
					</label>
				)}
			</div>
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
								<label htmlFor={`workflow-${workflow.name}`} className="cursor-pointer flex-1 flex flex-col gap-1">
									<span className="font-semibold text-foreground">{workflow.name}</span>
									{workflow.description && (
										<span className="text-sm text-muted-foreground">{workflow.description}</span>
									)}
								</label>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
