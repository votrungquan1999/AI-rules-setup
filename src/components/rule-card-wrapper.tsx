"use client";

import { useRuleScore } from "src/lib/search.state";
import { useIsRuleSelected, useToggleSelection } from "src/lib/selection.state";
import { RuleCardProvider } from "./rule-card.context";
import { Checkbox } from "./ui/checkbox";
import { useId } from "react";

interface RuleCardWrapperProps {
	/** Rule ID for tracking selection and score */
	ruleId: string;
	/** Server-rendered content (name, description, tags, ScoreBadge, etc.) */
	children: React.ReactNode;
}

/**
 * Client wrapper for rule cards that handles:
 * - Context provider for child components
 * - Checkbox for selection using shadcn/ui
 * - CSS ordering based on relevancy score
 * - Clickable card via semantic label/checkbox association
 */
export function RuleCardWrapper({ ruleId, children }: RuleCardWrapperProps) {
	const score = useRuleScore(ruleId);
	const isSelected = useIsRuleSelected(ruleId);
	const toggleSelection = useToggleSelection();
	const checkboxId = useId();

	return (
		<RuleCardProvider ruleId={ruleId}>
			<label
				htmlFor={checkboxId}
				className={`
					block w-full text-left p-4 rounded-lg border transition-colors cursor-pointer
					${isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}
				`}
				style={{ order: -score }} // CSS ordering: higher scores appear first
			>
				<div className="flex items-start gap-3">
					{/* Shadcn Checkbox */}
					<div className="mt-1">
						<Checkbox
							id={checkboxId}
							checked={isSelected}
							onCheckedChange={() => toggleSelection(ruleId)}
						/>
					</div>

					{/* Content area - server-rendered children can use useRuleCardId() */}
					<div className="flex-1 min-w-0">{children}</div>
				</div>
			</label>
		</RuleCardProvider>
	);
}
