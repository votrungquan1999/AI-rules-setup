"use client";

import { createContext, type ReactNode, useContext, useId } from "react";
import { useRuleScore } from "src/lib/search.state";
import { useIsRuleSelected, useToggleSelection } from "src/lib/selection.state";
import { Checkbox } from "./ui/checkbox";

interface RuleCardContextValue {
	/** Rule ID for this card */
	ruleId: string;
	/** Unique checkbox ID for label association */
	checkboxId: string;
}

const RuleCardContext = createContext<RuleCardContextValue | null>(null);

interface RuleCardProviderProps {
	/** Rule ID for tracking selection and score */
	ruleId: string;
	/** Child components */
	children: ReactNode;
}

/**
 * Context provider for rule card components
 * Provides ruleId and checkboxId to child components
 */
export function RuleCardProvider({ ruleId, children }: RuleCardProviderProps) {
	const checkboxId = useId();

	return <RuleCardContext.Provider value={{ ruleId, checkboxId }}>{children}</RuleCardContext.Provider>;
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

/**
 * Hook to get checkbox ID from card context
 */
export function useRuleCardCheckboxId(): string {
	const context = useContext(RuleCardContext);
	if (!context) {
		throw new Error("useRuleCardCheckboxId must be used within RuleCardProvider");
	}
	return context.checkboxId;
}

interface RuleCardLabelProps {
	/** Label content (card children) */
	children: ReactNode;
}

/**
 * Clickable label wrapper for rule card
 * Handles styling, hover states, and CSS ordering based on relevancy score
 */
export function RuleCardLabel({ children }: RuleCardLabelProps) {
	const ruleId = useRuleCardId();
	const checkboxId = useRuleCardCheckboxId();
	const score = useRuleScore(ruleId);
	const isSelected = useIsRuleSelected(ruleId);

	return (
		<label
			htmlFor={checkboxId}
			data-testid={`rule-card-${ruleId}`}
			className={`
				block w-full text-left p-4 rounded-lg border transition-colors cursor-pointer
				${isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}
			`}
			style={{ order: -score }} // CSS ordering: higher scores appear first
		>
			{children}
		</label>
	);
}

/**
 * Checkbox component for rule selection
 * Uses context to get ruleId and handles selection state
 */
export function RuleCardCheckbox() {
	const ruleId = useRuleCardId();
	const checkboxId = useRuleCardCheckboxId();
	const isSelected = useIsRuleSelected(ruleId);
	const toggleSelection = useToggleSelection();

	return <Checkbox id={checkboxId} checked={isSelected} onCheckedChange={() => toggleSelection(ruleId)} />;
}
