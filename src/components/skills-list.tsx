"use client";

import * as React from "react";
import { Checkbox } from "src/components/ui/checkbox";
import { useSkills } from "src/lib/manifests.state";
import { useSelectedSkillNames, useSetSelectedSkills, useToggleSkillSelection } from "src/lib/selection.state";

/**
 * Reusable component for displaying skills section
 * Used by agent-specific display components that support skills (Antigravity, Claude Code)
 */
export function SkillsList() {
	const skills = useSkills();
	const selectedSkillNames = useSelectedSkillNames();
	const toggleSkillSelection = useToggleSkillSelection();
	const setSelectedSkills = useSetSelectedSkills();

	const allSkillNames = skills.map((s) => s.name);
	const isAllSelected = skills.length > 0 && selectedSkillNames.size === skills.length;
	const isIndeterminate = selectedSkillNames.size > 0 && selectedSkillNames.size < skills.length;

	const selectAllId = React.useId();

	const handleMasterToggle = () => {
		if (isAllSelected) {
			setSelectedSkills([]);
		} else {
			setSelectedSkills(allSkillNames);
		}
	};

	return (
		<div data-testid="skills-section" className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-semibold text-foreground">Skills</h2>
				{skills.length > 0 && (
					<label
						htmlFor={selectAllId}
						className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground"
					>
						<Checkbox
							id={selectAllId}
							checked={isAllSelected}
							onCheckedChange={handleMasterToggle}
							data-state={isIndeterminate ? "indeterminate" : isAllSelected ? "checked" : "unchecked"}
							aria-label="Select all skills"
						/>
						Select All
					</label>
				)}
			</div>
			{skills.length === 0 ? (
				<div className="p-6 text-center text-muted-foreground">No skills available for this agent.</div>
			) : (
				<div className="flex flex-col gap-3">
					{skills.map((skill) => {
						const isSelected = selectedSkillNames.has(skill.name);
						return (
							<div key={skill.name} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card">
								<div className="mt-1">
									<Checkbox
										checked={isSelected}
										onCheckedChange={() => toggleSkillSelection(skill.name)}
										id={`skill-${skill.name}`}
										aria-label={skill.name}
									/>
								</div>
								<label htmlFor={`skill-${skill.name}`} className="cursor-pointer flex-1 flex flex-col gap-1">
									<span className="font-semibold text-foreground">{skill.name}</span>
									{skill.description && <span className="text-sm text-muted-foreground">{skill.description}</span>}
								</label>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
