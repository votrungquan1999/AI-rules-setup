"use client";

import { createContext, useContext, useMemo } from "react";
import type { Question } from "src/lib/question-types";
import { extractManifestsForAgent, extractSkillsForAgent } from "src/lib/rules-data-utils";
import { useSelectedAgent } from "src/lib/selection.state";
import type { Manifest, RulesData, SkillFile } from "src/server/types";

/**
 * Manifests context value
 */
interface ManifestsContextValue {
	/** Complete rules data for all agents */
	rulesData: RulesData;
	/** All available questions */
	questions: Question[];
	/** Available agent names */
	agents: string[];
}

const ManifestsContext = createContext<ManifestsContextValue | null>(null);

interface ManifestsProviderProps {
	/** Complete rules data for all agents */
	rulesData: RulesData;
	/** All available questions */
	questions: Question[];
	/** Available agent names */
	agents: string[];
	/** Child components */
	children: React.ReactNode;
}

/**
 * Manifests context provider that provides rules data, questions, and agents
 * Uses normal React context, not reducer context
 */
export function ManifestsProvider({ rulesData, questions, agents, children }: ManifestsProviderProps) {
	const value = useMemo(() => ({ rulesData, questions, agents }), [rulesData, questions, agents]);

	return <ManifestsContext.Provider value={value}>{children}</ManifestsContext.Provider>;
}

/**
 * Hook to get manifests for the currently selected agent
 */
export function useManifests(): Manifest[] {
	const context = useContext(ManifestsContext);
	if (!context) {
		throw new Error("useManifests must be used within ManifestsProvider");
	}

	const selectedAgent = useSelectedAgent();

	return useMemo(() => {
		return extractManifestsForAgent(context.rulesData, selectedAgent);
	}, [context.rulesData, selectedAgent]);
}

/**
 * Hook to get all available questions
 */
export function useQuestions(): Question[] {
	const context = useContext(ManifestsContext);
	if (!context) {
		throw new Error("useQuestions must be used within ManifestsProvider");
	}

	return context.questions;
}

/**
 * Hook to get available agent names
 */
export function useAgents(): string[] {
	const context = useContext(ManifestsContext);
	if (!context) {
		throw new Error("useAgents must be used within ManifestsProvider");
	}

	return context.agents;
}

/**
 * Hook to get skills for the currently selected agent
 */
export function useSkills(): SkillFile[] {
	const context = useContext(ManifestsContext);
	if (!context) {
		throw new Error("useSkills must be used within ManifestsProvider");
	}

	const selectedAgent = useSelectedAgent();

	return useMemo(() => {
		return extractSkillsForAgent(context.rulesData, selectedAgent);
	}, [context.rulesData, selectedAgent]);
}
