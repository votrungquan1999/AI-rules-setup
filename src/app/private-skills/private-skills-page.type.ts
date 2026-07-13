/**
 * Client-facing display shape for a private skill on the reviewer browse page. A plain serializable
 * object derived from `StoredPrivateSkillDocument` (no MongoDB `_id`, no Date fields) — only the
 * fields the reviewer needs to see. Kept separate from the DB document per database-patterns.
 */
export interface PrivateSkillDisplay {
	/** Permanent stable id used to address this skill when editing it. */
	id: string;
	name: string;
	agent: string;
	/** Full skill body — not shown on the card, but needed to pre-fill the edit dialog. */
	content: string;
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
	EditSkill = "edit-skill",
	Remove = "remove",
}

/** Toggles the "global only" filter on the skills list. */
export interface ToggleGlobalFilterAction {
	type: PrivateSkillsPageActionType.ToggleGlobalFilter;
}

/** Replaces a skill's name/content/description/scopes in the list (after an edit resolves). */
export interface EditSkillAction {
	type: PrivateSkillsPageActionType.EditSkill;
	id: string;
	name: string;
	content: string;
	description: string;
	scopes: string[];
}

/** Drops a skill from the list (after a delete resolves). */
export interface RemoveSkillAction {
	type: PrivateSkillsPageActionType.Remove;
	id: string;
}

export type PrivateSkillsPageAction = ToggleGlobalFilterAction | EditSkillAction | RemoveSkillAction;
