"use client";

import { createReducerContext } from "src/app/hooks/createReducerContext";
import { normalizeScopes } from "src/lib/normalize-scopes";
import {
	type EditSkillAction,
	type PrivateSkillDisplay,
	type PrivateSkillsPageAction,
	PrivateSkillsPageActionType,
	type PrivateSkillsPageState,
} from "./private-skills-page.type";

const initialState: PrivateSkillsPageState = { skills: [], showGlobalOnly: false, savePending: false };

/**
 * Reducer for the private-skills browse page. Toggles the global-only filter, replaces a skill's
 * editable fields (name/content/description/scopes) in the list after an edit resolves, or flags
 * whether a save is in flight.
 * @param state - Current state
 * @param action - The browse-page action to apply
 * @returns The next state
 */
function privateSkillsReducer(state: PrivateSkillsPageState, action: PrivateSkillsPageAction): PrivateSkillsPageState {
	switch (action.type) {
		case PrivateSkillsPageActionType.ToggleGlobalFilter:
			return { ...state, showGlobalOnly: !state.showGlobalOnly };
		case PrivateSkillsPageActionType.EditSkill:
			return {
				...state,
				skills: state.skills.map((skill) => {
					if (skill.id !== action.id) return skill;
					const next: PrivateSkillDisplay = {
						id: skill.id,
						agent: skill.agent,
						name: action.name,
						content: action.content,
						scopes: action.scopes,
					};
					if (action.description !== undefined) next.description = action.description;
					return next;
				}),
			};
		case PrivateSkillsPageActionType.SetSavePending:
			return { ...state, savePending: action.pending };
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

/**
 * Exposes whether the edit-dialog Save request is currently in flight, so the Save button can show a
 * pending state without the component reading raw state directly.
 * @returns `true` while a save is in flight, otherwise `false`
 */
export function usePrivateSkillsSavePending() {
	return useRawState().savePending;
}

/**
 * Domain actions for the private-skills page. `editSkill` saves a skill's edited fields via the
 * PATCH endpoint (addressed by id), normalizing scopes and coercing an empty description to
 * undefined (so it is cleared), then updates the in-memory list on success so the card re-renders. It
 * brackets the request with a save-pending flag (set before, cleared in `finally`) for the Save button.
 * @returns the `editSkill` action callback
 */
export function usePrivateSkillsActions() {
	const dispatch = useRawDispatch();
	return {
		editSkill: async (id: string, name: string, content: string, description: string, scopes: string[]) => {
			const normalizedScopes = normalizeScopes(scopes);
			const cleanedDescription = description.trim() === "" ? undefined : description;
			dispatch({ type: PrivateSkillsPageActionType.SetSavePending, pending: true });
			try {
				const response = await fetch(`/api/skills/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, content, description: cleanedDescription, scopes: normalizedScopes }),
				});
				if (response.ok) {
					const action: EditSkillAction = {
						type: PrivateSkillsPageActionType.EditSkill,
						id,
						name,
						content,
						scopes: normalizedScopes,
					};
					if (cleanedDescription !== undefined) action.description = cleanedDescription;
					dispatch(action);
				}
			} finally {
				dispatch({ type: PrivateSkillsPageActionType.SetSavePending, pending: false });
			}
		},
	};
}
