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

const initialState: PrivateSkillsPageState = { skills: [], showGlobalOnly: false };

/**
 * Reducer for the private-skills browse page. Toggles the global-only filter, or replaces a skill's
 * editable fields (name/content/description/scopes) in the list after an edit resolves.
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
						description: action.description,
						scopes: action.scopes,
					};
					return next;
				}),
			};
		case PrivateSkillsPageActionType.Remove:
			return { ...state, skills: state.skills.filter((skill) => skill.id !== action.id) };
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
 * Domain actions for the private-skills page. `editSkill` saves a skill's edited fields via the
 * PATCH endpoint (addressed by id), normalizing scopes and always sending the description as a raw
 * string (whitespace-only is trimmed to "" so a blank field still clears it) — the partial-patch
 * contract treats an absent key as "leave intact" and "" as "clear", so the key must always be sent.
 * Updates the in-memory list on success so the card re-renders. `deleteSkill` permanently removes a
 * skill via the DELETE endpoint (addressed by id); a 404 (already gone) is treated the same as
 * success (D9 R19), since the reviewer's intent — the skill being gone — is already satisfied.
 * @returns the `editSkill` and `deleteSkill` action callbacks
 */
export function usePrivateSkillsActions() {
	const dispatch = useRawDispatch();
	return {
		editSkill: async (id: string, name: string, content: string, description: string, scopes: string[]) => {
			const normalizedScopes = normalizeScopes(scopes);
			const sendableDescription = description.trim() === "" ? "" : description;
			const response = await fetch(`/api/skills/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, content, description: sendableDescription, scopes: normalizedScopes }),
			});
			if (response.ok) {
				const action: EditSkillAction = {
					type: PrivateSkillsPageActionType.EditSkill,
					id,
					name,
					content,
					description: sendableDescription,
					scopes: normalizedScopes,
				};
				dispatch(action);
			}
		},
		deleteSkill: async (id: string) => {
			const response = await fetch(`/api/skills/${id}`, { method: "DELETE" });
			if (response.ok || response.status === 404) {
				dispatch({ type: PrivateSkillsPageActionType.Remove, id });
			}
		},
	};
}
