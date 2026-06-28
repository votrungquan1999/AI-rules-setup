"use client";

import { createReducerContext } from "src/app/hooks/createReducerContext";
import { normalizeScopes } from "src/lib/normalize-scopes";
import { type KbBrowseAction, KbBrowseActionType, type KbBrowseState } from "./kb-browse.type";

const initialState: KbBrowseState = { entries: [], editingId: null };

/**
 * Reducer for the canonical KB browse screen. Opens/closes the edit dialog, or replaces an entry's
 * title/body/scope after an edit resolves. The Edit transition never touches `status` — an edited
 * approved entry stays canonical.
 * @param state - Current browse state
 * @param action - The browse action to apply
 * @returns The next browse state
 */
function kbBrowseReducer(state: KbBrowseState, action: KbBrowseAction): KbBrowseState {
	switch (action.type) {
		case KbBrowseActionType.SetEditing:
			return { ...state, editingId: action.id };
		case KbBrowseActionType.Edit:
			return {
				...state,
				entries: state.entries.map((e) =>
					e.id === action.id ? { ...e, title: action.title, body: action.body, scope: action.scope } : e,
				),
			};
		default:
			return state;
	}
}

const [Provider, useRawState, useRawDispatch] = createReducerContext(kbBrowseReducer, initialState);

export const KbBrowseProvider = Provider;

/**
 * Exposes the canonical entries to display.
 * @returns The browse entries
 */
export function useKbBrowseEntries() {
	return useRawState().entries;
}

/**
 * Exposes the edit dialog: the entry currently being edited (looked up from `editingId`, or null
 * when closed) plus callbacks to open and close it.
 * @returns `editingEntry`, `openEdit`, and `closeEdit`
 */
export function useKbBrowseEditDialog() {
	const { entries, editingId } = useRawState();
	const dispatch = useRawDispatch();
	return {
		editingEntry: editingId === null ? null : (entries.find((e) => e.id === editingId) ?? null),
		openEdit: (id: string) => dispatch({ type: KbBrowseActionType.SetEditing, id }),
		closeEdit: () => dispatch({ type: KbBrowseActionType.SetEditing, id: null }),
	};
}

/**
 * Domain actions for the browse screen. `editEntry` saves a canonical entry's edited title/body/scope
 * via the PATCH endpoint (which preserves status), normalizing scopes first; on success it updates
 * the in-memory list and closes the dialog so the card reflects the change immediately, no reload.
 * @returns the `editEntry` action callback
 */
export function useKbBrowseActions() {
	const dispatch = useRawDispatch();
	return {
		editEntry: async (id: string, title: string, body: string, scope: string[]) => {
			const normalizedScope = normalizeScopes(scope);
			const response = await fetch(`/api/kb/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title, body, scope: normalizedScope }),
			});
			if (response.ok) {
				dispatch({ type: KbBrowseActionType.Edit, id, title, body, scope: normalizedScope });
				dispatch({ type: KbBrowseActionType.SetEditing, id: null });
			}
		},
	};
}
