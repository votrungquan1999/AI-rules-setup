// Import the config first: it sets MONGODB_DB_NAME, which the DB module reads at import time.
import "../../../playwright.config";
import { getDatabase } from "../../../src/server/database";
import { insertKbDraft } from "../../../src/server/kb-repository";
import { storePrivateSkill } from "../../../src/server/rules-repository";
import {
	KB_DOCS_COLLECTION_NAME,
	type KbType,
	PRIVATE_SKILLS_COLLECTION_NAME,
	type SkillFile,
} from "../../../src/server/types";

/** Removes all KB documents so a spec starts from a known-empty review list. */
export async function clearKbDocs(): Promise<void> {
	const db = await getDatabase();
	await db.collection(KB_DOCS_COLLECTION_NAME).deleteMany({});
}

/** Removes all private skills so a spec starts from a known-empty list. */
export async function clearPrivateSkills(): Promise<void> {
	const db = await getDatabase();
	await db.collection(PRIVATE_SKILLS_COLLECTION_NAME).deleteMany({});
}

/** Seeds one draft KB doc awaiting review; returns its id. */
export async function seedKbDraft(draft: {
	type: KbType;
	title: string;
	body: string;
	scope: string[];
}): Promise<string> {
	return insertKbDraft(draft);
}

/** Seeds one private skill. */
export async function seedPrivateSkill(agent: string, skill: SkillFile, scopes: string[]): Promise<void> {
	await storePrivateSkill(agent, skill, scopes);
}
