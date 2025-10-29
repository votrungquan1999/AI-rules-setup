"use client";

import { useMemo } from "react";
import { createReducerContext } from "src/app/hooks/createReducerContext";
import type { Question, QuestionAnswer } from "src/lib/question-types";
import type { Manifest } from "src/server/types";
import { eng, removeStopwords } from "stopword";
import { type SearchResult, searchRules } from "./search";

// import { type SearchResult, searchRules } from "./search-minisearch";

/**
 * Search state interface
 */
interface SearchState {
	/** User description (used as search query) */
	description: string;
	/** All available manifests to search through */
	manifests: Manifest[];
	/** All available questions */
	questions: Question[];
	/** Answers keyed by question id */
	answers: Record<string, QuestionAnswer>;
	/** Computed enriched context tokens from description + answers */
	enrichedContext: string[];
}

/**
 * Search action types
 */
type SearchAction =
	| { type: "SET_DESCRIPTION"; payload: string }
	| { type: "SET_MANIFESTS"; payload: Manifest[] }
	| { type: "SET_QUESTIONS"; payload: Question[] }
	| { type: "SET_ANSWER"; payload: { id: string; answer: QuestionAnswer } }
	| { type: "CLEAR_ANSWERS" };

/**
 * Initial search state
 */
const initialState: SearchState = {
	description: "",
	manifests: [],
	questions: [],
	answers: {},
	enrichedContext: [],
};

/**
 * Search reducer function
 * @param state - Current search state
 * @param action - Action to perform
 * @returns Updated search state
 */
function searchReducer(state: SearchState, action: SearchAction): SearchState {
	switch (action.type) {
		case "SET_DESCRIPTION":
			return {
				...state,
				description: action.payload,
				enrichedContext: computeEnrichedContext(action.payload, state.answers, state.questions),
			};
		case "SET_MANIFESTS":
			return { ...state, manifests: action.payload };
		case "SET_QUESTIONS":
			return { ...state, questions: action.payload };
		case "SET_ANSWER": {
			const { id, answer } = action.payload;
			const newAnswers = { ...state.answers, [id]: answer };
			return {
				...state,
				answers: newAnswers,
				enrichedContext: computeEnrichedContext(state.description, newAnswers, state.questions),
			};
		}
		case "CLEAR_ANSWERS":
			return {
				...state,
				answers: {},
				enrichedContext: computeEnrichedContext(state.description, {}, state.questions),
			};
		default:
			return state;
	}
}

// Create context with reducer
// Build enriched context tokens from description and answers
function tokenize(text: string): string[] {
	const parts = text
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t.length >= 2);
	return removeStopwords(parts, eng);
}

function computeEnrichedContext(
	description: string,
	answers: Record<string, QuestionAnswer>,
	questions: Question[],
): string[] {
	const tokens = new Set<string>();

	// Add description tokens
	for (const t of tokenize(description)) {
		tokens.add(t);
	}

	// Add tokens from answers
	for (const [id, answer] of Object.entries(answers)) {
		const q = questions.find((qq) => qq.id === id);
		if (!q) continue;

		if (answer.type === "yes-no") {
			if (answer.value && q.type === "yes-no") {
				for (const k of q.keywords) {
					tokens.add(k.toLowerCase());
				}
			}
		} else if (answer.type === "choice") {
			if (q.type === "choice") {
				const opt = q.options[answer.value];
				if (opt) {
					for (const k of opt.keywords) {
						tokens.add(k.toLowerCase());
					}
				}
			}
		} else if (answer.type === "open-ended") {
			for (const t of tokenize(answer.value)) {
				tokens.add(t);
			}
		}
	}

	return Array.from(tokens);
}

const [SearchProviderBase, useSearchState, useSearchDispatch] = createReducerContext(searchReducer, initialState);

interface SearchProviderProps {
	/** All available manifests to search through */
	manifests: Manifest[];
	/** All available questions */
	questions?: Question[];
	/** Child components */
	children: React.ReactNode;
}

/**
 * Search context provider that manages fuzzy search state
 * Performs search on query changes and exposes results to children
 */
export function SearchProvider({ manifests, questions = [], children }: SearchProviderProps) {
	return (
		<SearchProviderBase manifests={manifests} questions={questions}>
			{children}
		</SearchProviderBase>
	);
}

/**
 * Hook to get current search query
 */
export function useSearchQuery(): string {
	const state = useSearchState();
	return state.description;
}

/**
 * Hook to set search query
 */
export function useSetSearchQuery(): (query: string) => void {
	const dispatch = useSearchDispatch();
	return (query: string) => dispatch({ type: "SET_DESCRIPTION", payload: query });
}

/**
 * Hook to get search results
 * Performs fuzzy search when query changes
 * Results are memoized to prevent unnecessary recalculations
 */
export function useSearchResults(): SearchResult[] {
	const state = useSearchState();
	const combinedQuery = useMemo(() => {
		return [state.description, ...state.enrichedContext].join(" ").trim();
	}, [state.description, state.enrichedContext]);

	return useMemo(() => searchRules(combinedQuery, state.manifests), [combinedQuery, state.manifests]);
}

/**
 * Hook to get score for a specific rule ID
 * Uses memoized search results for performance
 */
export function useRuleScore(ruleId: string): number {
	const results = useSearchResults();
	const result = results.find((r) => r.manifest.id === ruleId);
	return result?.score ?? 0;
}

// Additional hooks for questions and answers management
export function useQuestions(): Question[] {
	const state = useSearchState();
	return state.questions;
}

export function useSetQuestions(): (questions: Question[]) => void {
	const dispatch = useSearchDispatch();
	return (questions: Question[]) => dispatch({ type: "SET_QUESTIONS", payload: questions });
}

export function useSetAnswer(): (id: string, answer: QuestionAnswer) => void {
	const dispatch = useSearchDispatch();
	return (id: string, answer: QuestionAnswer) => dispatch({ type: "SET_ANSWER", payload: { id, answer } });
}

export function useQuestionAnswer(id: string): QuestionAnswer | undefined {
	const state = useSearchState();
	return state.answers[id];
}

export function useAnsweredCount(): number {
	const state = useSearchState();
	return Object.keys(state.answers).length;
}

export function useClearAnswers(): () => void {
	const dispatch = useSearchDispatch();
	return () => dispatch({ type: "CLEAR_ANSWERS" });
}
