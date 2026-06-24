"use client";

import { createReducerContext } from "src/app/hooks/createReducerContext";
import {
	type PrivateSkillsPageAction,
	PrivateSkillsPageActionType,
	type PrivateSkillsPageState,
} from "./private-skills-page.type";

const initialState: PrivateSkillsPageState = { skills: [], showGlobalOnly: false };

/**
 * Reducer for the private-skills browse page. Toggles the global-only filter; the skill list itself
 * is seeded via the provider's initial props and never mutated.
 * @param state - Current state
 * @param action - The browse-page action to apply
 * @returns The next state
 */
function privateSkillsReducer(state: PrivateSkillsPageState, action: PrivateSkillsPageAction): PrivateSkillsPageState {
	switch (action.type) {
		case PrivateSkillsPageActionType.ToggleGlobalFilter:
			return { ...state, showGlobalOnly: !state.showGlobalOnly };
		default:
			return state;
	}
}

const [Provider, useRawState, useRawDispatch] = createReducerContext(privateSkillsReducer, initialState);

export const PrivateSkillsProvider = Provider;

/**
 * Exposes the list of private skills to display.
 * @returns The seeded private skills
 */
export function usePrivateSkills() {
	const state = useRawState();
	return state.showGlobalOnly ? state.skills.filter((s) => s.scopes.length === 0) : state.skills;
}

/**
 * Exposes the global-only filter state and a toggle for it.
 * @returns `showGlobalOnly` flag and a `toggleGlobalFilter` callback
 */
export function usePrivateSkillsFilter() {
	const { showGlobalOnly } = useRawState();
	const dispatch = useRawDispatch();
	return {
		showGlobalOnly,
		toggleGlobalFilter: () => dispatch({ type: PrivateSkillsPageActionType.ToggleGlobalFilter }),
	};
}
