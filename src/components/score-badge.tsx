"use client";

import { useRuleScore } from "src/lib/search.state";
import { cn } from "src/lib/utils";
import { useRuleCardId } from "./rule-card-wrapper";

/**
 * Score badge component that displays relevancy score with semantic color tokens
 * Uses RuleCardContext to get ruleId, then fetches score from SearchContext
 * Can be used in server-rendered content within RuleCardWrapper
 */
export function ScoreBadge() {
	const ruleId = useRuleCardId();
	const score = useRuleScore(ruleId);

	// Only show if there's a search query (score > 0)
	if (score === 0) {
		return null;
	}

	return (
		<span
			className={cn("inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium border", {
				"bg-success/10 text-success border-success/20": score >= 80,
				"bg-warning/10 text-warning border-warning/20": score >= 50,
				"bg-muted text-muted-foreground border-border": score < 50,
			})}
		>
			Score: {score}
		</span>
	);
}
