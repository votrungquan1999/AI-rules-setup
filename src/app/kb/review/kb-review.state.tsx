"use client";

import { createReducerContext } from "src/app/hooks/createReducerContext";
import { type KbReviewAction, KbReviewActionType, type KbReviewState } from "./kb-review.type";

const initialState: KbReviewState = { drafts: [] };

/**
 * Reducer for the review screen. Removes a draft after approve/reject, or replaces its title/body
 * after an edit. All transitions are applied AFTER the corresponding API call resolves.
 * @param state - Current review state
 * @param action - The review action to apply
 * @returns The next review state
 */
function kbReviewReducer(state: KbReviewState, action: KbReviewAction): KbReviewState {
	switch (action.type) {
		case KbReviewActionType.Remove:
			return { drafts: state.drafts.filter((d) => d.id !== action.id) };
		case KbReviewActionType.Edit:
			return {
				drafts: state.drafts.map((d) => (d.id === action.id ? { ...d, title: action.title, body: action.body } : d)),
			};
		default:
			return state;
	}
}

const [Provider, useRawState, useRawDispatch] = createReducerContext(kbReviewReducer, initialState);

export const KbReviewProvider = Provider;

/**
 * Exposes the current list of drafts awaiting review.
 * @returns The drafts array
 */
export function useKbReviewDrafts() {
	return useRawState().drafts;
}

/**
 * Domain actions for the review screen. Each performs the API round-trip, then updates the list on
 * success: approve/reject remove the draft, edit replaces its title/body (status stays draft).
 * @returns approve/reject/edit action callbacks
 */
export function useKbReviewActions() {
	const dispatch = useRawDispatch();
	return {
		approveDraft: async (id: string) => {
			const response = await fetch(`/api/kb/${id}/approve`, { method: "POST" });
			if (response.ok) dispatch({ type: KbReviewActionType.Remove, id });
		},
		rejectDraft: async (id: string) => {
			const response = await fetch(`/api/kb/${id}/reject`, { method: "POST" });
			if (response.ok) dispatch({ type: KbReviewActionType.Remove, id });
		},
		editDraft: async (id: string, title: string, body: string) => {
			const response = await fetch(`/api/kb/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title, body }),
			});
			if (response.ok) dispatch({ type: KbReviewActionType.Edit, id, title, body });
		},
	};
}
