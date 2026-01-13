"use client";

import { RuleCardCheckbox, RuleCardLabel, RuleCardProvider } from "src/components/rule-card-wrapper";
import { ScoreBadge } from "src/components/score-badge";
import { TruncatedDescription } from "src/components/truncated-description";
import { Checkbox } from "src/components/ui/checkbox";
import { useDisplayManifests } from "src/hooks/useDisplayManifests";
import { useManifests, useSkills } from "src/lib/manifests.state";
import { useSelectedSkillNames, useToggleSkillSelection } from "src/lib/selection.state";

/**
 * Display component for Claude Code agent rules and skills
 */
export function ClaudeCodeDisplay() {
	const displayManifests = useDisplayManifests();
	const allManifests = useManifests();
	const skills = useSkills();
	const selectedSkillNames = useSelectedSkillNames();
	const toggleSkillSelection = useToggleSkillSelection();

	return (
		<div className="space-y-4">
			{/* Rules section */}
			<div className="flex flex-col gap-3">
				{allManifests.length === 0 ? (
					<div data-testid="empty-state" className="p-6 text-center text-muted-foreground">
						No rules available for the selected agent.
					</div>
				) : displayManifests.length === 0 ? (
					<div data-testid="no-search-results" className="p-6 text-center text-muted-foreground">
						No rules match your search.
					</div>
				) : (
					displayManifests.map((manifest) => (
						<RuleCardProvider key={manifest.id} ruleId={manifest.id}>
							<RuleCardLabel>
								<div className="flex items-start gap-3">
									{/* Checkbox */}
									<div className="mt-1">
										<RuleCardCheckbox />
									</div>

									{/* Server-rendered content */}
									<div className="flex-1 min-w-0 space-y-2">
										<div className="flex items-center gap-2">
											<h3 className="font-semibold text-foreground">{manifest.id}</h3>
											<ScoreBadge />
										</div>
										<TruncatedDescription text={manifest.description} />
										{manifest.tags.length > 0 && (
											<div className="flex flex-wrap gap-1">
												{manifest.tags.slice(0, 5).map((tag) => (
													<span key={tag} className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
														{tag}
													</span>
												))}
												{manifest.tags.length > 5 && (
													<span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
														+{manifest.tags.length - 5}
													</span>
												)}
											</div>
										)}
									</div>
								</div>
							</RuleCardLabel>
						</RuleCardProvider>
					))
				)}
			</div>

			{/* Skills section */}
			<div data-testid="skills-section" className="space-y-4">
				<h2 className="text-2xl font-semibold text-foreground">Skills</h2>
				{skills.length === 0 ? (
					<div className="p-6 text-center text-muted-foreground">No skills available for Claude Code.</div>
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
									<label
										htmlFor={`skill-${skill.name}`}
										className="font-semibold text-foreground cursor-pointer flex-1"
									>
										{skill.name}
									</label>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
