/**
 * Client-facing display shape for a private skill on the reviewer browse page. A plain serializable
 * object derived from `StoredPrivateSkillDocument` (no MongoDB `_id`, no Date fields) — only the
 * fields the reviewer needs to see. Kept separate from the DB document per database-patterns.
 */
export interface PrivateSkillDisplay {
	name: string;
	agent: string;
	scopes: string[];
	description?: string;
}

/** Browse-page state: the full list of private skills plus whether the global-only filter is on. */
export interface PrivateSkillsPageState {
	skills: PrivateSkillDisplay[];
	showGlobalOnly: boolean;
}

/** Discriminator for the browse-page reducer actions. */
export enum PrivateSkillsPageActionType {
	ToggleGlobalFilter = "toggle-global-filter",
}

/** Toggles the "global only" filter on the skills list. */
export interface ToggleGlobalFilterAction {
	type: PrivateSkillsPageActionType.ToggleGlobalFilter;
}

export type PrivateSkillsPageAction = ToggleGlobalFilterAction;
