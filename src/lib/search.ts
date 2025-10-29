import Fuse from "fuse.js";
import type { Question } from "src/lib/question-types";
import type { Manifest } from "src/server/types";
import { eng, removeStopwords } from "stopword";

/**
 * Search result with relevancy score and matched fields
 */
export interface SearchResult {
	/** Rule manifest */
	manifest: Manifest;
	/** Relevancy score (0-100, higher is better) */
	score: number;
	/** Fields that matched the query */
	matchedFields: string[];
}

/**
 * Extended manifest with tokenized description for searching
 */
interface SearchableManifest extends Manifest {
	/** Tokenized description words for better search matching */
	descriptionTokens: string[];
}

/**
 * Tokenizes a string into lowercase words with minimum length and removes stop words
 * @param text - Text to tokenize
 * @param minLength - Minimum token length (default: 2)
 * @returns Array of lowercase tokens with stop words removed
 */
function tokenize(text: string, minLength = 2): string[] {
	const words = text
		.toLowerCase()
		.split(/\s+/)
		.filter((token) => token.length >= minLength);
	return removeStopwords(words, eng);
}

/**
 * Prepares manifests for searching by adding tokenized description field
 * @param manifests - Array of rule manifests
 * @returns Array of searchable manifests with tokenized fields
 */
function prepareSearchableManifests(manifests: Manifest[]): SearchableManifest[] {
	return manifests.map((manifest) => ({
		...manifest,
		descriptionTokens: tokenize(manifest.description),
	}));
}

/**
 * Searches rules using token-based fuzzy matching
 * Searches each token individually and aggregates scores based on matches
 * @param query - User's free-text search query
 * @param manifests - Array of rule manifests to search through
 * @returns Array of search results sorted by relevancy score (highest first)
 */
export function searchRules(query: string, manifests: Manifest[]): SearchResult[] {
	// If no query, return all manifests with neutral score
	if (!query.trim()) {
		return manifests.map((manifest) => ({
			manifest,
			score: 0,
			matchedFields: [],
		}));
	}

	// Tokenize query for better multi-word matching
	const queryTokens = tokenize(query);

	// Prepare searchable manifests with tokenized descriptions
	const searchableManifests = prepareSearchableManifests(manifests);

	// Configure Fuse.js for individual token searches
	const fuse = new Fuse(searchableManifests, {
		keys: [
			{ name: "tags", weight: 0.4 }, // High weight for tags
			{ name: "descriptionTokens", weight: 0.4 }, // Equal weight for description tokens
			{ name: "category", weight: 0.2 }, // Lower weight for category
		],
		threshold: 0.4, // Moderate threshold for fuzzy matching
		includeScore: true,
		includeMatches: true,
		minMatchCharLength: 2,
		ignoreLocation: true,
		isCaseSensitive: false,
	});

	// Map to track aggregate scores for each manifest
	const manifestScores = new Map<
		string,
		{ manifest: SearchableManifest; totalScore: number; matchedFields: Set<string> }
	>();

	// Search for each token and aggregate results
	for (const token of queryTokens) {
		const tokenResults = fuse.search(token);

		for (const result of tokenResults) {
			const manifestId = result.item.id;
			const existing = manifestScores.get(manifestId);

			// Fuse.js score is 0 (perfect) to 1 (poor)
			// Convert to points: 0 = 100 points, 1 = 0 points
			const tokenScore = Math.round((1 - (result.score ?? 1)) * 100);

			// Extract matched fields
			const matchedFields = new Set<string>(existing?.matchedFields || []);
			if (result.matches) {
				for (const match of result.matches) {
					const fieldKey = match.key === "descriptionTokens" ? "description" : match.key;
					if (fieldKey) {
						matchedFields.add(fieldKey);
					}
				}
			}

			if (existing) {
				// Aggregate score - add points for each matching token
				existing.totalScore += tokenScore;
				existing.matchedFields = new Set([...existing.matchedFields, ...matchedFields]);
			} else {
				// First match for this manifest
				manifestScores.set(manifestId, {
					manifest: result.item,
					totalScore: tokenScore,
					matchedFields,
				});
			}
		}
	}

	// Convert to search results and normalize scores
	const maxPossibleScore = queryTokens.length * 100; // Each token can contribute up to 100 points
	const results: SearchResult[] = Array.from(manifestScores.values()).map(
		({ manifest, totalScore, matchedFields }) => ({
			manifest,
			score: Math.min(100, Math.round((totalScore / maxPossibleScore) * 100)),
			matchedFields: Array.from(matchedFields),
		}),
	);

	// Sort by score (highest first)
	return results.sort((a, b) => b.score - a.score);
}

/**
 * Searches questions using context tokens and their tags
 * @param contextTokens - tokens built from description and answers
 * @param questions - list of questions
 * @returns questions sorted by match score
 */
export function searchQuestions(contextTokens: string[], questions: Question[]): Question[] {
	if (contextTokens.length === 0) return questions;

	const fuse = new Fuse(questions, {
		keys: [{ name: "tags", weight: 1 }],
		threshold: 0.4,
		includeScore: true,
		ignoreLocation: true,
		isCaseSensitive: false,
	});

	const scores = new Map<string, number>();

	for (const token of contextTokens) {
		const res = fuse.search(token);
		for (const r of res) {
			const prev = scores.get(r.item.id) ?? 0;
			const tokenScore = Math.round((1 - (r.score ?? 1)) * 100);
			scores.set(r.item.id, prev + tokenScore);
		}
	}

	return [...questions].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
}
