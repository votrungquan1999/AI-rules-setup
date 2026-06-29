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
	SetPendingDraft = "set-pending-draft",
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

/** Marks a draft as having an approve/reject request in flight (`id`), or clears it (`null`). */
export interface SetPendingDraftAction {
	type: KbReviewActionType.SetPendingDraft;
	id: string | null;
}

export type KbReviewAction = RemoveDraftAction | EditDraftAction | ToggleGlobalFilterAction | SetPendingDraftAction;

/**
 * Review screen state: the drafts awaiting a decision, whether the global-only filter is on, and the
 * id of the draft whose approve/reject request is currently in flight (`null` when none).
 */
export interface KbReviewState {
	drafts: KbDocDraft[];
	showGlobalOnly: boolean;
	pendingDraftId: string | null;
}
