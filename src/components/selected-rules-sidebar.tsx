"use client";

import { Check, X } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useSkills, useWorkflows } from "src/lib/manifests.state";
import {
	useClearSelections,
	useSelectAll,
	useSelectedRuleIds,
	useSelectedSkillNames,
	useSelectedWorkflowNames,
	useToggleSelection,
	useToggleSkillSelection,
	useToggleWorkflowSelection,
} from "src/lib/selection.state";
import type { Manifest } from "src/server/types";

interface SelectedRulesSidebarProps {
	/** All available manifests (to look up names from IDs) */
	manifests: Manifest[];
}

/**
 * Sidebar showing selected rules with remove buttons using shadcn Button
 */
export function SelectedRulesSidebar({ manifests }: SelectedRulesSidebarProps) {
	const selectedIds = useSelectedRuleIds();
	const toggleSelection = useToggleSelection();
	const clearSelections = useClearSelections();
	const selectAll = useSelectAll();
	const selectedSkillNames = useSelectedSkillNames();
	const toggleSkillSelection = useToggleSkillSelection();
	const skills = useSkills();
	const selectedWorkflowNames = useSelectedWorkflowNames();
	const toggleWorkflowSelection = useToggleWorkflowSelection();
	const workflows = useWorkflows();

	const allIds = manifests.map((m) => m.id);
	const isAllSelected = selectedIds.size === allIds.length && allIds.every((id) => selectedIds.has(id));

	// Get manifests for selected IDs
	const selectedManifests = manifests.filter((m) => selectedIds.has(m.id));

	// Get selected skills
	const selectedSkills = skills.filter((skill) => selectedSkillNames.has(skill.name));

	// Get selected workflows
	const selectedWorkflows = workflows.filter((workflow) => selectedWorkflowNames.has(workflow.name));

	return (
		<div className="p-6 border-b border-border">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold text-foreground">
					Selected Rules ({selectedIds.size}){selectedSkills.length > 0 && `, Skills (${selectedSkills.length})`}
					{selectedWorkflows.length > 0 && `, Workflows (${selectedWorkflows.length})`}
				</h2>
				{isAllSelected ? (
					<Button type="button" variant="ghost" size="sm" onClick={() => clearSelections()} className="h-7 text-xs">
						<X className="size-3 mr-1" />
						Clear All
					</Button>
				) : (
					<Button type="button" variant="ghost" size="sm" onClick={() => selectAll(allIds)} className="h-7 text-xs">
						<Check className="size-3 mr-1" />
						Select All
					</Button>
				)}
			</div>

			{selectedManifests.length === 0 && selectedSkills.length === 0 && selectedWorkflows.length === 0 ? (
				<p className="text-sm text-muted-foreground">No rules selected yet.</p>
			) : (
				<div className="space-y-2">
					{selectedManifests.map((manifest) => (
						<div key={manifest.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50">
							<span className="text-sm text-foreground truncate">{manifest.id}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={(e) => {
									e.stopPropagation();
									toggleSelection(manifest.id);
								}}
								className="shrink-0 size-6 hover:bg-destructive/20 hover:text-destructive"
								aria-label={`Remove ${manifest.id}`}
							>
								<X className="size-4" />
							</Button>
						</div>
					))}
					{selectedSkills.map((skill) => (
						<div key={skill.name} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50">
							<span className="text-sm text-foreground truncate">{skill.name}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={(e) => {
									e.stopPropagation();
									toggleSkillSelection(skill.name);
								}}
								className="shrink-0 size-6 hover:bg-destructive/20 hover:text-destructive"
								aria-label={`Remove ${skill.name}`}
							>
								<X className="size-4" />
							</Button>
						</div>
					))}
					{selectedWorkflows.map((workflow) => (
						<div key={workflow.name} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50">
							<span className="text-sm text-foreground truncate">{workflow.name}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={(e) => {
									e.stopPropagation();
									toggleWorkflowSelection(workflow.name);
								}}
								className="shrink-0 size-6 hover:bg-destructive/20 hover:text-destructive"
								aria-label={`Remove ${workflow.name}`}
							>
								<X className="size-4" />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
