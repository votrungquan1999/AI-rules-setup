"use client";

import { createReducerContext } from "src/app/hooks/createReducerContext";
import { normalizeScopes } from "src/lib/normalize-scopes";
import { type KbDocDraft, type KbReviewAction, KbReviewActionType, type KbReviewState } from "./kb-review.type";

const initialState: KbReviewState = { drafts: [], showGlobalOnly: false, pendingDraftId: null };

/**
 * Reducer for the review screen. Removes a draft after approve/reject, replaces its
 * title/body/scope after an edit, toggles the global filter, or sets/clears which draft has an
 * approve/reject request in flight. Remove/Edit are applied AFTER the corresponding API call
 * resolves; SetPendingDraft brackets the in-flight request (set before, cleared after).
 * @param state - Current review state
 * @param action - The review action to apply
 * @returns The next review state
 */
function kbReviewReducer(state: KbReviewState, action: KbReviewAction): KbReviewState {
	switch (action.type) {
		case KbReviewActionType.Remove:
			return { ...state, drafts: state.drafts.filter((d) => d.id !== action.id) };
		case KbReviewActionType.Edit:
			return {
				...state,
				drafts: state.drafts.map((d) =>
					d.id === action.id ? { ...d, title: action.title, body: action.body, scope: action.scope } : d,
				),
			};
		case KbReviewActionType.ToggleGlobalFilter:
			return { ...state, showGlobalOnly: !state.showGlobalOnly };
		case KbReviewActionType.SetPendingDraft:
			return { ...state, pendingDraftId: action.id };
		default:
			return state;
	}
}

const [Provider, useRawState, useRawDispatch] = createReducerContext(kbReviewReducer, initialState);

export const KbReviewProvider = Provider;

/**
 * Exposes the list of drafts to display — narrowed to global (empty-scope) drafts when the
 * global-only filter is on, otherwise the full list.
 * @returns The (possibly filtered) drafts array
 */
export function useKbReviewDrafts() {
	const state = useRawState();
	return state.showGlobalOnly ? state.drafts.filter((d) => d.scope.length === 0) : state.drafts;
}

/**
 * Exposes the id of the draft whose approve/reject request is currently in flight (or `null`).
 * Lets the review screen mark that draft's actions pending without reading raw state directly.
 * @returns The pending draft id, or `null` when no approve/reject is in flight
 */
export function useKbReviewPendingDraftId() {
	return useRawState().pendingDraftId;
}

/**
 * Exposes the global-only filter state and a toggle for it.
 * @returns `showGlobalOnly` flag and a `toggleGlobalFilter` callback
 */
export function useKbReviewFilter() {
	const { showGlobalOnly } = useRawState();
	const dispatch = useRawDispatch();
	return {
		showGlobalOnly,
		toggleGlobalFilter: () => dispatch({ type: KbReviewActionType.ToggleGlobalFilter }),
	};
}

/**
 * Domain actions for the review screen. Each performs the API round-trip, then updates the list on
 * success: approve/reject remove the draft, edit replaces its title/body/scope (status stays draft).
 * `editDraft` returns whether the save succeeded so the caller can keep the edit dialog open on failure.
 * @returns approve/reject/edit action callbacks
 */
export function useKbReviewActions() {
	const dispatch = useRawDispatch();
	return {
		approveDraft: async (id: string) => {
			dispatch({ type: KbReviewActionType.SetPendingDraft, id });
			try {
				const response = await fetch(`/api/kb/${id}/approve`, { method: "POST" });
				if (response.ok) dispatch({ type: KbReviewActionType.Remove, id });
			} finally {
				dispatch({ type: KbReviewActionType.SetPendingDraft, id: null });
			}
		},
		rejectDraft: async (id: string) => {
			dispatch({ type: KbReviewActionType.SetPendingDraft, id });
			try {
				const response = await fetch(`/api/kb/${id}/reject`, { method: "POST" });
				if (response.ok) dispatch({ type: KbReviewActionType.Remove, id });
			} finally {
				dispatch({ type: KbReviewActionType.SetPendingDraft, id: null });
			}
		},
		editDraft: async (id: string, title: string, body: string, scope: string[]): Promise<boolean> => {
			const normalizedScope = normalizeScopes(scope);
			const response = await fetch(`/api/kb/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title, body, scope: normalizedScope }),
			});
			if (response.ok) dispatch({ type: KbReviewActionType.Edit, id, title, body, scope: normalizedScope });
			return response.ok;
		},
		// Single round-trip bulk approve: send every visible draft's id, then remove from the list
		// only the ids the server reports as actually flipped (drops any that were already canonical).
		approveAllDrafts: async (drafts: KbDocDraft[]) => {
			if (drafts.length === 0) return;
			const response = await fetch(`/api/kb/approve-all`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids: drafts.map((d) => d.id) }),
			});
			if (!response.ok) return;
			const { approvedIds } = (await response.json()) as { approvedIds: string[] };
			for (const id of approvedIds) dispatch({ type: KbReviewActionType.Remove, id });
		},
	};
}
