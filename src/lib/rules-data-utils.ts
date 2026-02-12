import type { Manifest, RulesData, SkillFile, WorkflowFile } from "src/server/types";

/**
 * Extracts all manifests for a specific agent from complete rules data
 * @param rulesData - Complete rules data containing all agents
 * @param agent - Agent name to extract manifests for
 * @returns Array of manifests for the specified agent, or empty array if agent not found
 */
export function extractManifestsForAgent(rulesData: RulesData, agent: string): Manifest[] {
	const agentData = rulesData.agents[agent];
	if (!agentData) {
		return [];
	}

	return Object.values(agentData.categories).map((category) => category.manifest);
}

/**
 * Extracts all skills for a specific agent from complete rules data
 * @param rulesData - Complete rules data containing all agents
 * @param agent - Agent name to extract skills for
 * @returns Array of skills for the specified agent, or empty array if agent not found or has no skills
 */
export function extractSkillsForAgent(rulesData: RulesData, agent: string): SkillFile[] {
	const agentData = rulesData.agents[agent];
	if (!agentData || !agentData.skills) {
		return [];
	}

	return agentData.skills;
}

/**
 * Extracts all workflows for a specific agent from complete rules data
 * @param rulesData - Complete rules data containing all agents
 * @param agent - Agent name to extract workflows for
 * @returns Array of workflows for the specified agent, or empty array if agent not found or has no workflows
 */
export function extractWorkflowsForAgent(rulesData: RulesData, agent: string): WorkflowFile[] {
	const agentData = rulesData.agents[agent];
	if (!agentData || !agentData.workflows) {
		return [];
	}

	return agentData.workflows;
}
