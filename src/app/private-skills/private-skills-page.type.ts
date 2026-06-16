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

/** Browse-page state: the full list of private skills to display. */
export interface PrivateSkillsPageState {
	skills: PrivateSkillDisplay[];
}
