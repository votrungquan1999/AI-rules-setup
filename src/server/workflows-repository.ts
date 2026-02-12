import { getDatabase } from "./database";
import { type StoredWorkflowsDocument, WORKFLOWS_COLLECTION_NAME, type WorkflowFile } from "./types";

/**
 * Stores workflows data for a specific agent
 * @param agent - Agent name (e.g., 'antigravity')
 * @param workflows - Array of workflow files to store
 * @param githubCommitSha - GitHub commit SHA (optional)
 * @returns True if successful, false otherwise
 */
export async function storeWorkflowsData(
	agent: string,
	workflows: WorkflowFile[],
	githubCommitSha = "unknown",
): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<StoredWorkflowsDocument>(WORKFLOWS_COLLECTION_NAME);

	const now = new Date();
	const document: StoredWorkflowsDocument = {
		agent,
		workflows,
		githubCommitSha,
		lastFetched: now,
		createdAt: now,
		updatedAt: now,
	};

	await collection.replaceOne({ agent }, document, { upsert: true });

	console.log(`Successfully stored ${workflows.length} workflows for ${agent}`);
	return true;
}

/**
 * Finds workflows for a specific agent
 * @param agent - Agent name (e.g., 'antigravity')
 * @returns Array of workflow files or null if not found
 */
export async function findWorkflowsByAgent(agent: string): Promise<WorkflowFile[] | null> {
	const db = await getDatabase();
	const collection = db.collection<StoredWorkflowsDocument>(WORKFLOWS_COLLECTION_NAME);

	const document = await collection.findOne({ agent });

	if (!document) {
		return null;
	}

	return document.workflows;
}
