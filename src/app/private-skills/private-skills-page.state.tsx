"use client";

import { createReducerContext } from "src/app/hooks/createReducerContext";
import type { PrivateSkillsPageState } from "./private-skills-page.type";

/** No interactive actions on this read-only browse page. */
interface PrivateSkillsPageAction {
	type: "noop";
}

const initialState: PrivateSkillsPageState = { skills: [] };

/**
 * Reducer for the private-skills browse page. The page is read-only, so the reducer simply returns
 * the current state (the skill list is seeded via the provider's initial props).
 * @param state - Current state
 * @param _action - Unused (no interactive actions)
 * @returns The unchanged state
 */
function privateSkillsReducer(state: PrivateSkillsPageState, _action: PrivateSkillsPageAction): PrivateSkillsPageState {
	return state;
}

const [Provider, useRawState] = createReducerContext(privateSkillsReducer, initialState);

export const PrivateSkillsProvider = Provider;

/**
 * Exposes the list of private skills to display.
 * @returns The seeded private skills
 */
export function usePrivateSkills() {
	return useRawState().skills;
}
