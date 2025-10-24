"use client";

import { createReducerContext } from "src/app/hooks/createReducerContext";
import type { Manifest } from "src/server/types";
import { type SearchResult, searchRules } from "./search";
// import { type SearchResult, searchRules } from "./search-minisearch";

/**
 * Search state interface
 */
interface SearchState {
	/** Current search query */
	query: string;
	/** All available manifests to search through */
	manifests: Manifest[];
}

/**
 * Search action types
 */
type SearchAction = { type: "SET_QUERY"; payload: string } | { type: "SET_MANIFESTS"; payload: Manifest[] };

/**
 * Initial search state
 */
const initialState: SearchState = {
	query: "",
	manifests: [],
};

/**
 * Search reducer function
 * @param state - Current search state
 * @param action - Action to perform
 * @returns Updated search state
 */
function searchReducer(state: SearchState, action: SearchAction): SearchState {
	switch (action.type) {
		case "SET_QUERY":
			return { ...state, query: action.payload };
		case "SET_MANIFESTS":
			return { ...state, manifests: action.payload };
		default:
			return state;
	}
}

// Create context with reducer
const [SearchProviderBase, useSearchState, useSearchDispatch] = createReducerContext(searchReducer, initialState);

interface SearchProviderProps {
	/** All available manifests to search through */
	manifests: Manifest[];
	/** Child components */
	children: React.ReactNode;
}

/**
 * Search context provider that manages fuzzy search state
 * Performs search on query changes and exposes results to children
 */
export function SearchProvider({ manifests, children }: SearchProviderProps) {
	return <SearchProviderBase manifests={manifests}>{children}</SearchProviderBase>;
}

/**
 * Hook to get current search query
 */
export function useSearchQuery(): string {
	const state = useSearchState();
	return state.query;
}

/**
 * Hook to set search query
 */
export function useSetSearchQuery(): (query: string) => void {
	const dispatch = useSearchDispatch();
	return (query: string) => dispatch({ type: "SET_QUERY", payload: query });
}

/**
 * Hook to get search results
 * Performs fuzzy search when query changes
 */
export function useSearchResults(): SearchResult[] {
	const state = useSearchState();
	return searchRules(state.query, state.manifests);
}

/**
 * Hook to get score for a specific rule ID
 */
export function useRuleScore(ruleId: string): number {
	const state = useSearchState();
	const results = searchRules(state.query, state.manifests);
	const result = results.find((r) => r.manifest.id === ruleId);
	return result?.score ?? 0;
}
