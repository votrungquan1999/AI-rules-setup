import { randomUUID } from "node:crypto";
import type { UpdateFilter } from "mongodb";
import { getDatabase } from "./database";
import {
	HOOKS_COLLECTION_NAME,
	PRIVATE_SKILLS_COLLECTION_NAME,
	RULES_DATA_COLLECTION_NAME,
	type RulesData,
	type RulesDataToStore,
	SKILLS_COLLECTION_NAME,
	type SkillFile,
	SkillVisibility,
	type StoredHooksDocument,
	type StoredPrivateSkillDocument,
	type StoredRulesDocument,
	type StoredSkillsDocument,
	type StoredWorkflowsDocument,
	WORKFLOWS_COLLECTION_NAME,
} from "./types";
import { createStoredRulesDocument, documentsToRulesData } from "./utils";

interface FindRulesOptions {
	includePrivate?: boolean;
	projectScope?: string[];
}

/**
 * Finds all stored rules from the database.
 * Public skills are always returned (tagged `visibility: "public"` at read time).
 * Private skills are merged in when `includePrivate=true` and a `projectScope` list is provided —
 * filtered to skills whose `scopes` intersect the project's scopes, plus global (empty-scope)
 * skills. An empty `projectScope` delivers global skills only.
 * @param options - Optional flags controlling private-skill inclusion and scope filtering
 * @returns Complete rules data structure or null if no rules collection rows exist
 */
export async function findAllStoredRules(options: FindRulesOptions = {}): Promise<RulesData | null> {
	const db = await getDatabase();
	const collection = db.collection<StoredRulesDocument>(RULES_DATA_COLLECTION_NAME);

	const documents = await collection.find({}).toArray();

	if (documents.length === 0) {
		return null;
	}

	const rulesData = documentsToRulesData(documents);

	// Also fetch skills for each agent that has skills stored. Inject visibility="public" at
	// read time so existing public-skill documents (which never had the field) still surface it.
	const skillsCollection = db.collection<StoredSkillsDocument>(SKILLS_COLLECTION_NAME);
	const skillsDocuments = await skillsCollection.find({}).toArray();

	for (const skillsDoc of skillsDocuments) {
		const agent = rulesData.agents[skillsDoc.agent];
		if (agent) {
			agent.skills = skillsDoc.skills.map((s) => ({ ...s, visibility: s.visibility ?? SkillVisibility.Public }));
		}
	}

	// Merge private skills when requested and a project scope list is provided (possibly empty).
	// An empty scope still runs: `findAllStoredPrivateSkills([])` returns global skills only.
	if (options.includePrivate && options.projectScope) {
		const privateSkills = await findAllStoredPrivateSkills(options.projectScope);
		for (const priv of privateSkills) {
			const agent = rulesData.agents[priv.agent];
			if (!agent) continue;
			const existing = agent.skills ?? [];
			const merged: SkillFile = {
				name: priv.name,
				content: priv.content,
				visibility: SkillVisibility.Private,
				scopes: priv.scopes,
			};
			if (priv.description !== undefined) merged.description = priv.description;
			if (priv.supportingFiles !== undefined) merged.supportingFiles = priv.supportingFiles;
			existing.push(merged);
			agent.skills = existing;
		}
	}

	// Also fetch workflows for each agent that has workflows stored
	const workflowsCollection = db.collection<StoredWorkflowsDocument>(WORKFLOWS_COLLECTION_NAME);
	const workflowsDocuments = await workflowsCollection.find({}).toArray();

	for (const workflowsDoc of workflowsDocuments) {
		const agent = rulesData.agents[workflowsDoc.agent];
		if (agent) {
			agent.workflows = workflowsDoc.workflows;
		}
	}

	// Also fetch hooks for each agent that has hooks stored. Public/unscoped for now (DECISIONS.md) —
	// merged unconditionally, same as workflows, not gated behind includePrivate/projectScope.
	const hooksCollection = db.collection<StoredHooksDocument>(HOOKS_COLLECTION_NAME);
	const hooksDocuments = await hooksCollection.find({}).toArray();

	for (const hooksDoc of hooksDocuments) {
		const agent = rulesData.agents[hooksDoc.agent];
		if (agent) {
			agent.hooks = hooksDoc.hooks;
		}
	}

	return rulesData;
}

/**
 * Returns private skill documents that either intersect `projectScopes` OR are global (empty stored
 * `scopes`). Global skills surface for every workspace, additively with scoped matches; an empty
 * `projectScopes` arg therefore returns global skills only.
 * @param projectScopes - The project's declared scope tags
 * @returns Array of matching private skill documents (empty when none match)
 */
export async function findAllStoredPrivateSkills(projectScopes: string[]): Promise<StoredPrivateSkillDocument[]> {
	const db = await getDatabase();
	const collection = db.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME);
	return collection.find({ $or: [{ scopes: { $in: projectScopes } }, { scopes: { $size: 0 } }] }).toArray();
}

/**
 * Returns ALL private skill documents across every scope (no filter). Used by the reviewer-facing
 * private-skills page, which must browse the whole catalog rather than a single workspace's scopes.
 * Skills stored before stable ids existed are back-filled with a permanent id on first listing; the
 * `{ id: { $exists: false } }` filter makes the write idempotent so concurrent listings cannot
 * assign two different ids to the same document.
 * @returns Array of all private skill documents (empty when none exist), each carrying an id
 */
export async function findAllPrivateSkills(): Promise<StoredPrivateSkillDocument[]> {
	const db = await getDatabase();
	const collection = db.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME);
	const documents = await collection.find({}).toArray();

	for (const doc of documents) {
		if (doc.id !== undefined) continue;
		const id = randomUUID();
		const result = await collection.updateOne(
			{ agent: doc.agent, name: doc.name, id: { $exists: false } },
			{ $set: { id } },
		);
		if (result.modifiedCount === 1) {
			// This call won the race and wrote the id.
			doc.id = id;
		} else {
			// A concurrent listing already back-filled it — re-read the persisted id.
			const existing = await collection.findOne({ agent: doc.agent, name: doc.name });
			if (existing?.id !== undefined) doc.id = existing.id;
		}
	}

	return documents;
}

interface UpdatePrivateSkillFields {
	name?: string;
	content?: string;
	description?: string;
	scopes?: string[];
}

/**
 * Partially updates a private skill's editable fields — name, content, description, scopes —
 * addressed by its permanent id. Any subset of fields may be provided; only the keys present on
 * `fields` are `$set`. Leaves the owning agent, createdAt, and supportingFiles intact. `description`
 * uses key-presence semantics: absent = leave the stored description untouched, `""` = clear
 * (`$unset`) it, non-empty string = `$set` it.
 * @param id - The private skill's permanent id
 * @param fields - Any subset of name, content, description, and scopes to update
 * @returns True when a document matched (even if values were unchanged); false when no skill had that id
 */
export async function updatePrivateSkill(id: string, fields: UpdatePrivateSkillFields): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME);

	const $set: Partial<StoredPrivateSkillDocument> = { updatedAt: new Date() };
	if ("name" in fields && fields.name !== undefined) $set.name = fields.name;
	if ("content" in fields && fields.content !== undefined) $set.content = fields.content;
	if ("scopes" in fields && fields.scopes !== undefined) $set.scopes = fields.scopes;

	const update: UpdateFilter<StoredPrivateSkillDocument> = { $set };
	// Key presence distinguishes "leave intact" (absent) from "clear" ("") from "set" (non-empty).
	if ("description" in fields) {
		if (fields.description === "") {
			update.$unset = { description: "" };
		} else {
			$set.description = fields.description;
		}
	}

	const result = await collection.updateOne({ id }, update);
	return result.matchedCount === 1;
}

/**
 * Deletes a private skill by its permanent id.
 * @param id - The private skill's permanent id
 * @returns True when a document was deleted; false when no skill had that id
 */
export async function deletePrivateSkill(id: string): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME);
	const result = await collection.deleteOne({ id });
	return result.deletedCount === 1;
}

/**
 * Stores rules data for a specific agent and category
 * @param dataToStore - Rules data to store
 * @returns True if successful, false otherwise
 */
export async function storeRulesData(dataToStore: RulesDataToStore): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<StoredRulesDocument>(RULES_DATA_COLLECTION_NAME);

	const document = createStoredRulesDocument(dataToStore);

	await collection.replaceOne({ agent: dataToStore.agent, category: dataToStore.category }, document, { upsert: true });

	console.log(`Successfully stored rules for ${dataToStore.agent}/${dataToStore.category}`);
	return true;
}

/**
 * Stores skills data for a specific agent
 * @param agent - Agent name (e.g., 'claude-code')
 * @param skills - Array of skill files to store
 * @param githubCommitSha - GitHub commit SHA (optional)
 * @returns True if successful, false otherwise
 */
export async function storeSkillsData(
	agent: string,
	skills: SkillFile[],
	githubCommitSha = "unknown",
): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<StoredSkillsDocument>(SKILLS_COLLECTION_NAME);

	const now = new Date();
	const document: StoredSkillsDocument = {
		agent,
		skills,
		githubCommitSha,
		lastFetched: now,
		createdAt: now,
		updatedAt: now,
	};

	await collection.replaceOne({ agent }, document, { upsert: true });

	console.log(`Successfully stored ${skills.length} skills for ${agent}`);
	return true;
}

/**
 * Upserts a single private skill into the per-skill private_skills_data collection.
 * Keyed by { agent, name } so independent uploads do not race or clobber siblings. A permanent
 * `id` is generated via `$setOnInsert` on first insert only, so re-uploading the same skill keeps
 * its id stable (which is what makes a later rename safe to address by id).
 * @param agent - Agent name (e.g., 'claude-code')
 * @param skill - The skill payload to persist (name, content, supportingFiles, scopes)
 * @param scopes - Scope tags this private skill is visible under
 * @returns True when the upsert completes
 */
export async function storePrivateSkill(agent: string, skill: SkillFile, scopes: string[]): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME);
	const now = new Date();

	const $set: Partial<StoredPrivateSkillDocument> = {
		agent,
		name: skill.name,
		content: skill.content,
		supportingFiles: skill.supportingFiles ?? [],
		scopes,
		updatedAt: now,
	};
	if (skill.description !== undefined) $set.description = skill.description;

	await collection.updateOne(
		{ agent, name: skill.name },
		{
			$set,
			$setOnInsert: { createdAt: now, id: randomUUID() },
		},
		{ upsert: true },
	);

	return true;
}
