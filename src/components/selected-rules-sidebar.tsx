"use client";

import { X } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useSkills, useWorkflows } from "src/lib/manifests.state";
import {
	useClearSelections,
	useSelectAll,
	useSelectedRuleIds,
	useSelectedSkillNames,
	useSelectedWorkflowNames,
	useSetSelectedSkills,
	useSetSelectedWorkflows,
	useToggleSelection,
	useToggleSkillSelection,
	useToggleWorkflowSelection,
} from "src/lib/selection.state";
import type { Manifest } from "src/server/types";

interface SelectedRulesSidebarProps {
	/** All available manifests (to look up names from IDs) */
	manifests: Manifest[];
}

interface SelectionSectionProps {
	title: string;
	items: Array<{ id: string; name: string }>;
	onClear: () => void;
	onToggle: (id: string) => void;
}

function SelectionSection({ title, items, onClear, onToggle }: SelectionSectionProps) {
	if (items.length === 0) return null;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onClear}
					className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
				>
					Clear {title}
				</Button>
			</div>
			<div className="space-y-2">
				{items.map((item) => (
					<div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50">
						<span className="text-sm text-foreground truncate">{item.name}</span>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={(e) => {
								e.stopPropagation();
								onToggle(item.id);
							}}
							className="shrink-0 size-6 hover:bg-destructive/20 hover:text-destructive"
							aria-label={`Remove ${item.name}`}
						>
							<X className="size-4" />
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Sidebar showing selected items grouped by type
 */
export function SelectedRulesSidebar({ manifests }: SelectedRulesSidebarProps) {
	const selectedIds = useSelectedRuleIds();
	const toggleSelection = useToggleSelection();
	const clearSelections = useClearSelections();
	const selectAll = useSelectAll(); // For rules
	const selectedSkillNames = useSelectedSkillNames();
	const toggleSkillSelection = useToggleSkillSelection();
	const setSelectedSkills = useSetSelectedSkills();
	const skills = useSkills();
	const selectedWorkflowNames = useSelectedWorkflowNames();
	const toggleWorkflowSelection = useToggleWorkflowSelection();
	const setSelectedWorkflows = useSetSelectedWorkflows();
	const workflows = useWorkflows();

	// Get manifests for selected IDs
	const selectedManifests = manifests.filter((m) => selectedIds.has(m.id));
	const selectedSkillsList = skills.filter((skill) => selectedSkillNames.has(skill.name));
	const selectedWorkflowsList = workflows.filter((workflow) => selectedWorkflowNames.has(workflow.name));

	const totalSelected = selectedIds.size + selectedSkillNames.size + selectedWorkflowNames.size;

	return (
		<div className="p-6 border-b border-border">
			<div className="flex items-center justify-between xl:flex-row flex-col max-xl:items-start gap-2 mb-6">
				<h2 className="text-lg font-semibold text-foreground">Selected Items ({totalSelected})</h2>
				{totalSelected > 0 && (
					<Button type="button" variant="ghost" size="sm" onClick={() => clearSelections()} className="h-7 text-xs">
						<X className="size-3 mr-1" />
						Clear All
					</Button>
				)}
			</div>

			{totalSelected === 0 ? (
				<p className="text-sm text-muted-foreground">No items selected yet.</p>
			) : (
				<div className="space-y-6">
					<SelectionSection
						title="Skills"
						items={selectedSkillsList.map((s) => ({ id: s.name, name: s.name }))}
						onClear={() => setSelectedSkills([])}
						onToggle={toggleSkillSelection}
					/>
					<SelectionSection
						title="Workflows"
						items={selectedWorkflowsList.map((w) => ({ id: w.name, name: w.name }))}
						onClear={() => setSelectedWorkflows([])}
						onToggle={toggleWorkflowSelection}
					/>
					<SelectionSection
						title="Rules"
						items={selectedManifests.map((m) => ({ id: m.id, name: m.id }))}
						onClear={() => selectAll([])}
						onToggle={toggleSelection}
					/>
				</div>
			)}
		</div>
	);
}
