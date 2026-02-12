import { getDatabase } from "./database";
import {
	RULES_DATA_COLLECTION_NAME,
	type RulesData,
	type RulesDataToStore,
	SKILLS_COLLECTION_NAME,
	type SkillFile,
	type StoredRulesDocument,
	type StoredSkillsDocument,
	type StoredWorkflowsDocument,
	WORKFLOWS_COLLECTION_NAME,
} from "./types";
import { createStoredRulesDocument, documentsToRulesData } from "./utils";

/**
 * Finds all stored rules from the database
 * @returns Complete rules data structure or null if no data found
 */
export async function findAllStoredRules(): Promise<RulesData | null> {
	const db = await getDatabase();
	const collection = db.collection<StoredRulesDocument>(RULES_DATA_COLLECTION_NAME);

	const documents = await collection.find({}).toArray();

	if (documents.length === 0) {
		return null;
	}

	const rulesData = documentsToRulesData(documents);

	// Also fetch skills for each agent that has skills stored
	const skillsCollection = db.collection<StoredSkillsDocument>(SKILLS_COLLECTION_NAME);
	const skillsDocuments = await skillsCollection.find({}).toArray();

	for (const skillsDoc of skillsDocuments) {
		const agent = rulesData.agents[skillsDoc.agent];
		if (agent) {
			agent.skills = skillsDoc.skills;
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
