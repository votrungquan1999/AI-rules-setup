import { getDatabase } from "./database";
import {
	PRIVATE_SKILLS_COLLECTION_NAME,
	RULES_DATA_COLLECTION_NAME,
	type RulesData,
	type RulesDataToStore,
	SKILLS_COLLECTION_NAME,
	type SkillFile,
	SkillVisibility,
	type StoredPrivateSkillDocument,
	type StoredRulesDocument,
	type StoredSkillsDocument,
	type StoredWorkflowsDocument,
	WORKFLOWS_COLLECTION_NAME,
} from "./types";
import { createStoredRulesDocument, documentsToRulesData } from "./utils";

interface FindRulesOptions {
	includePrivate?: boolean;
	projectScope?: string;
}

/**
 * Finds all stored rules from the database.
 * Public skills are always returned (tagged `visibility: "public"` at read time).
 * Private skills are merged in only when `includePrivate=true` AND `projectScope` is set —
 * filtered to skills whose `scopes` array contains an exact match for `projectScope`.
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

	// Merge private skills when requested and a project scope is provided.
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

	return rulesData;
}

/**
 * Returns all private skill documents whose `scopes` array contains `projectScope` (exact match).
 * @param projectScope - The project's declared scope tag
 * @returns Array of matching private skill documents (empty when none match)
 */
export async function findAllStoredPrivateSkills(projectScope: string): Promise<StoredPrivateSkillDocument[]> {
	const db = await getDatabase();
	const collection = db.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME);
	return collection.find({ scopes: projectScope }).toArray();
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
 * Keyed by { agent, name } so independent uploads do not race or clobber siblings.
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
			$setOnInsert: { createdAt: now },
		},
		{ upsert: true },
	);

	return true;
}
