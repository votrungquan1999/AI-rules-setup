"use client";

import { createContext, type ReactNode, useContext } from "react";

interface RuleCardContextValue {
	/** Rule ID for this card */
	ruleId: string;
}

const RuleCardContext = createContext<RuleCardContextValue | null>(null);

interface RuleCardProviderProps {
	/** Rule ID */
	ruleId: string;
	/** Child components */
	children: ReactNode;
}

/**
 * Context provider for rule card components
 * Provides ruleId to child components like ScoreBadge
 */
export function RuleCardProvider({ ruleId, children }: RuleCardProviderProps) {
	return <RuleCardContext.Provider value={{ ruleId }}>{children}</RuleCardContext.Provider>;
}

/**
 * Hook to get current rule ID from card context
 */
export function useRuleCardId(): string {
	const context = useContext(RuleCardContext);
	if (!context) {
		throw new Error("useRuleCardId must be used within RuleCardProvider");
	}
	return context.ruleId;
}
