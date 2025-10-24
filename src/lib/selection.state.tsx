"use client";

import { createReducerContext } from "src/app/hooks/createReducerContext";
import type { OverwriteStrategy } from "src/cli/lib/types";
import { generateCliCommand } from "./command-generator";

/**
 * Selection state interface
 */
interface SelectionState {
	/** Selected agent name */
	agent: string;
	/** Set of selected rule IDs */
	selectedIds: Set<string>;
	/** Overwrite strategy for conflicts */
	overwriteStrategy: OverwriteStrategy;
}

/**
 * Selection action types
 */
type SelectionAction =
	| { type: "SET_AGENT"; payload: string }
	| { type: "TOGGLE_SELECTION"; payload: string }
	| { type: "CLEAR_SELECTIONS" }
	| { type: "SET_STRATEGY"; payload: OverwriteStrategy };

/**
 * Initial selection state
 */
const initialState: SelectionState = {
	agent: "cursor",
	selectedIds: new Set<string>(),
	overwriteStrategy: "prompt",
};

/**
 * Selection reducer function
 * @param state - Current selection state
 * @param action - Action to perform
 * @returns Updated selection state
 */
function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
	switch (action.type) {
		case "SET_AGENT":
			return { ...state, agent: action.payload };

		case "TOGGLE_SELECTION": {
			const newSet = new Set(state.selectedIds);
			if (newSet.has(action.payload)) {
				newSet.delete(action.payload);
			} else {
				newSet.add(action.payload);
			}
			return { ...state, selectedIds: newSet };
		}

		case "CLEAR_SELECTIONS":
			return { ...state, selectedIds: new Set<string>() };

		case "SET_STRATEGY":
			return { ...state, overwriteStrategy: action.payload };

		default:
			return state;
	}
}

// Create context with reducer
const [SelectionProviderBase, useSelectionState, useSelectionDispatch] = createReducerContext(
	selectionReducer,
	initialState,
);

interface SelectionProviderProps {
	/** Default agent */
	defaultAgent?: string;
	/** Child components */
	children: React.ReactNode;
}

/**
 * Selection context provider that manages rule selection and command generation
 * Tracks selected rules, agent choice, and conflict resolution strategy
 */
export function SelectionProvider({ defaultAgent = "cursor", children }: SelectionProviderProps) {
	return <SelectionProviderBase agent={defaultAgent}>{children}</SelectionProviderBase>;
}

/**
 * Hook to get selected agent
 */
export function useSelectedAgent(): string {
	const state = useSelectionState();
	return state.agent;
}

/**
 * Hook to set selected agent
 */
export function useSetAgent(): (agent: string) => void {
	const dispatch = useSelectionDispatch();
	return (agent: string) => dispatch({ type: "SET_AGENT", payload: agent });
}

/**
 * Hook to check if a rule is selected
 */
export function useIsRuleSelected(ruleId: string): boolean {
	const state = useSelectionState();
	return state.selectedIds.has(ruleId);
}

/**
 * Hook to toggle rule selection
 */
export function useToggleSelection(): (ruleId: string) => void {
	const dispatch = useSelectionDispatch();
	return (ruleId: string) => dispatch({ type: "TOGGLE_SELECTION", payload: ruleId });
}

/**
 * Hook to get all selected rule IDs
 */
export function useSelectedRuleIds(): Set<string> {
	const state = useSelectionState();
	return state.selectedIds;
}

/**
 * Hook to clear all selections
 */
export function useClearSelections(): () => void {
	const dispatch = useSelectionDispatch();
	return () => dispatch({ type: "CLEAR_SELECTIONS" });
}

/**
 * Hook to get overwrite strategy
 */
export function useOverwriteStrategy(): OverwriteStrategy {
	const state = useSelectionState();
	return state.overwriteStrategy;
}

/**
 * Hook to set overwrite strategy
 */
export function useSetOverwriteStrategy(): (strategy: OverwriteStrategy) => void {
	const dispatch = useSelectionDispatch();
	return (strategy: OverwriteStrategy) => dispatch({ type: "SET_STRATEGY", payload: strategy });
}

/**
 * Hook to get generated CLI command
 * Computes command from current state
 */
export function useGeneratedCommand(): string {
	const state = useSelectionState();

	if (state.selectedIds.size === 0) {
		return "";
	}

	try {
		const categories = Array.from(state.selectedIds);
		return generateCliCommand(state.agent, categories, state.overwriteStrategy);
	} catch (error) {
		console.error("Error generating command:", error);
		return "";
	}
}
