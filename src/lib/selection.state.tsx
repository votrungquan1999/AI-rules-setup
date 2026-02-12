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
	/** Set of selected skill names */
	selectedSkillNames: Set<string>;
	/** Set of selected workflow names */
	selectedWorkflowNames: Set<string>;
	/** Overwrite strategy for conflicts */
	overwriteStrategy: OverwriteStrategy;
}

/**
 * Selection action types
 */
type SelectionAction =
	| { type: "SET_AGENT"; payload: string }
	| { type: "TOGGLE_SELECTION"; payload: string }
	| { type: "TOGGLE_SKILL_SELECTION"; payload: string }
	| { type: "TOGGLE_WORKFLOW_SELECTION"; payload: string }
	| { type: "CLEAR_SELECTIONS" }
	| { type: "SET_STRATEGY"; payload: OverwriteStrategy }
	| { type: "SELECT_ALL"; payload: string[] };

/**
 * Initial selection state
 */
const initialState: SelectionState = {
	agent: "cursor",
	selectedIds: new Set<string>(),
	selectedSkillNames: new Set<string>(),
	selectedWorkflowNames: new Set<string>(),
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
			return {
				...state,
				agent: action.payload,
				selectedIds: new Set<string>(),
				selectedSkillNames: new Set<string>(),
				selectedWorkflowNames: new Set<string>(),
			};

		case "TOGGLE_SELECTION": {
			const newSet = new Set(state.selectedIds);
			if (newSet.has(action.payload)) {
				newSet.delete(action.payload);
			} else {
				newSet.add(action.payload);
			}
			return { ...state, selectedIds: newSet };
		}

		case "TOGGLE_SKILL_SELECTION": {
			const newSet = new Set(state.selectedSkillNames);
			if (newSet.has(action.payload)) {
				newSet.delete(action.payload);
			} else {
				newSet.add(action.payload);
			}
			return { ...state, selectedSkillNames: newSet };
		}

		case "TOGGLE_WORKFLOW_SELECTION": {
			const newSet = new Set(state.selectedWorkflowNames);
			if (newSet.has(action.payload)) {
				newSet.delete(action.payload);
			} else {
				newSet.add(action.payload);
			}
			return { ...state, selectedWorkflowNames: newSet };
		}

		case "CLEAR_SELECTIONS":
			return {
				...state,
				selectedIds: new Set<string>(),
				selectedSkillNames: new Set<string>(),
				selectedWorkflowNames: new Set<string>(),
			};

		case "SET_STRATEGY":
			return { ...state, overwriteStrategy: action.payload };

		case "SELECT_ALL":
			return { ...state, selectedIds: new Set(action.payload) };

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
 * Hook to select all available categories
 */
export function useSelectAll(): (allIds: string[]) => void {
	const dispatch = useSelectionDispatch();
	return (allIds: string[]) => dispatch({ type: "SELECT_ALL", payload: allIds });
}

/**
 * Hook to get all selected skill names
 */
export function useSelectedSkillNames(): Set<string> {
	const state = useSelectionState();
	return state.selectedSkillNames;
}

/**
 * Hook to toggle skill selection
 */
export function useToggleSkillSelection(): (skillName: string) => void {
	const dispatch = useSelectionDispatch();
	return (skillName: string) => dispatch({ type: "TOGGLE_SKILL_SELECTION", payload: skillName });
}

/**
 * Hook to get all selected workflow names
 */
export function useSelectedWorkflowNames(): Set<string> {
	const state = useSelectionState();
	return state.selectedWorkflowNames;
}

/**
 * Hook to toggle workflow selection
 */
export function useToggleWorkflowSelection(): (workflowName: string) => void {
	const dispatch = useSelectionDispatch();
	return (workflowName: string) => dispatch({ type: "TOGGLE_WORKFLOW_SELECTION", payload: workflowName });
}

/**
 * Hook to get generated CLI command
 * Computes command from current state
 */
export function useGeneratedCommand(allIds: string[]): string {
	const state = useSelectionState();

	// Generate command if rules, skills, or workflows are selected
	if (state.selectedIds.size === 0 && state.selectedSkillNames.size === 0 && state.selectedWorkflowNames.size === 0) {
		return "";
	}

	try {
		// Check if all categories are selected
		const categories = Array.from(state.selectedIds);
		const isAllSelected = categories.length === allIds.length && categories.every((id) => allIds.includes(id));

		// If all are selected, use "all" as the category value
		const categoryValue = isAllSelected ? ["all"] : categories;

		const selectedSkills = Array.from(state.selectedSkillNames);
		const selectedWorkflows = Array.from(state.selectedWorkflowNames);

		return generateCliCommand(state.agent, categoryValue, state.overwriteStrategy, selectedSkills, selectedWorkflows);
	} catch (error) {
		console.error("Error generating command:", error);
		return "";
	}
}
