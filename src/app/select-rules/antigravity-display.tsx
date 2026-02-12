"use client";

import { RulesList } from "src/components/rules-list";
import { SkillsList } from "src/components/skills-list";
import { WorkflowsList } from "src/components/workflows-list";

/**
 * Display component for Antigravity agent
 * Shows both rules and skills sections
 */
export function AntigravityDisplay() {
	return (
		<div className="space-y-4">
			{/* Skills section */}
			<SkillsList />

			{/* Workflows section */}
			<WorkflowsList />

			{/* Rules section */}
			<RulesList />
		</div>
	);
}
