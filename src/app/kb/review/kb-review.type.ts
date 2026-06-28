import type { KbType } from "src/server/types";

/**
 * Client-facing draft shape for the review screen. A plain serializable object derived from the
 * server's `StoredKbDocDocument` (string `id`, no MongoDB `_id`, dates already ISO strings via the
 * `/api/kb/drafts` route). Kept separate from `KbDoc`/`StoredKbDocDocument` per database-patterns.
 */
export interface KbDocDraft {
	id: string;
	type: KbType;
	title: string;
	body: string;
	scope: string[];
}

/** Discriminator for the review reducer actions. */
export enum KbReviewActionType {
	Remove = "remove",
	Edit = "edit",
	ToggleGlobalFilter = "toggle-global-filter",
}

/** Removes a draft from the list (after approve or reject resolves). */
export interface RemoveDraftAction {
	type: KbReviewActionType.Remove;
	id: string;
}

/** Replaces a draft's title/body/scope in the list (after an edit resolves). */
export interface EditDraftAction {
	type: KbReviewActionType.Edit;
	id: string;
	title: string;
	body: string;
	scope: string[];
}

/** Toggles the "global only" filter on the drafts list. */
export interface ToggleGlobalFilterAction {
	type: KbReviewActionType.ToggleGlobalFilter;
}

export type KbReviewAction = RemoveDraftAction | EditDraftAction | ToggleGlobalFilterAction;

/** Review screen state: the drafts awaiting a decision, plus whether the global-only filter is on. */
export interface KbReviewState {
	drafts: KbDocDraft[];
	showGlobalOnly: boolean;
}
