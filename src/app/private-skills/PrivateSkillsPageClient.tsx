"use client";

import { usePrivateSkills } from "./private-skills-page.state";
import {
	PrivateSkillCard,
	PrivateSkillScopes,
	PrivateSkillScopeTag,
	PrivateSkillsHeader,
	PrivateSkillsLayout,
	PrivateSkillsList,
} from "./private-skills-page.ui";

/**
 * Reviewer-facing browse screen for private skills. Read-only: lists every private skill with its
 * name, originating agent, scope tags, and description so a reviewer can audit visibility.
 */
export function PrivateSkillsPageClient() {
	const skills = usePrivateSkills();

	return (
		<PrivateSkillsLayout>
			<PrivateSkillsHeader>
				<h1 className="text-3xl font-bold text-foreground">Private Skills</h1>
				<p className="text-muted-foreground">Every private skill across all workspace scopes.</p>
			</PrivateSkillsHeader>

			{skills.length === 0 ? (
				<p className="text-muted-foreground">No private skills found.</p>
			) : (
				<PrivateSkillsList>
					{skills.map((skill) => (
						<PrivateSkillCard key={`${skill.agent}/${skill.name}`}>
							<div className="flex items-center justify-between">
								<h2 className="font-semibold text-foreground">{skill.name}</h2>
								<span className="text-xs text-muted-foreground">{skill.agent}</span>
							</div>
							{skill.description && <p className="text-sm text-muted-foreground">{skill.description}</p>}
							<PrivateSkillScopes>
								{skill.scopes.map((scope) => (
									<PrivateSkillScopeTag key={scope}>{scope}</PrivateSkillScopeTag>
								))}
							</PrivateSkillScopes>
						</PrivateSkillCard>
					))}
				</PrivateSkillsList>
			)}
		</PrivateSkillsLayout>
	);
}
