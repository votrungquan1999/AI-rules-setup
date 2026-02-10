"use client";

import { Checkbox } from "src/components/ui/checkbox";
import { useSkills } from "src/lib/manifests.state";
import { useSelectedSkillNames, useToggleSkillSelection } from "src/lib/selection.state";

/**
 * Reusable component for displaying skills section
 * Used by agent-specific display components that support skills (Antigravity, Claude Code)
 */
export function SkillsList() {
	const skills = useSkills();
	const selectedSkillNames = useSelectedSkillNames();
	const toggleSkillSelection = useToggleSkillSelection();

	return (
		<div data-testid="skills-section" className="space-y-4">
			<h2 className="text-2xl font-semibold text-foreground">Skills</h2>
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
								<label htmlFor={`skill-${skill.name}`} className="font-semibold text-foreground cursor-pointer flex-1">
									{skill.name}
								</label>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
