import type { KbDoc } from "src/server/types";

/** Discriminator for the KB browse reducer actions. */
export enum KbBrowseActionType {
	Edit = "edit",
	SetEditing = "set-editing",
}

/**
 * Replaces a canonical entry's title/body/scope in the list after an edit resolves. Deliberately
 * carries no `status` — editing an approved entry must leave it canonical.
 */
export interface EditEntryAction {
	type: KbBrowseActionType.Edit;
	id: string;
	title: string;
	body: string;
	scope: string[];
}

/** Opens (id) or closes (null) the edit dialog for a canonical entry. */
export interface SetEditingAction {
	type: KbBrowseActionType.SetEditing;
	id: string | null;
}

export type KbBrowseAction = EditEntryAction | SetEditingAction;

/** Browse screen state: the canonical entries on display, plus which one's editor is open. */
export interface KbBrowseState {
	entries: KbDoc[];
	editingId: string | null;
}
