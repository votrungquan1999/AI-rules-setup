"use client";

import { RulesList } from "src/components/rules-list";
import { SkillsList } from "src/components/skills-list";

/**
 * Display component for Antigravity agent
 * Shows both rules and skills sections
 */
export function AntigravityDisplay() {
	return (
		<div className="space-y-4">
			{/* Rules section */}
			<RulesList />

			{/* Skills section */}
			<SkillsList />
		</div>
	);
}
