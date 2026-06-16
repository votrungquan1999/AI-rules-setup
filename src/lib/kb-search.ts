import Fuse from "fuse.js";
import type { KbDoc } from "src/server/types";
import { eng, removeStopwords } from "stopword";

/**
 * A KB search result: the matched document plus its relevancy score (0-100, higher is better).
 */
export interface KbSearchResult {
	/** The matched knowledge-base document */
	doc: KbDoc;
	/** Relevancy score (0-100, higher is better) */
	score: number;
}

/**
 * A KB document augmented with tokenized title/body fields for fuzzy searching.
 * `id` keys score aggregation (mirrors `manifest.id`'s role in `searchRules`).
 */
interface SearchableKbDoc {
	id: string;
	doc: KbDoc;
	titleTokens: string[];
	bodyTokens: string[];
}

/**
 * Tokenizes a string into lowercase words of at least `minLength` chars and removes stop words.
 * Inlined/duplicated from `src/lib/search.ts` (where `tokenize` is module-private, not exported).
 * @param text - Text to tokenize
 * @param minLength - Minimum token length (default: 2)
 * @returns Lowercase tokens with stop words removed
 */
function tokenize(text: string, minLength = 2): string[] {
	const words = text
		.toLowerCase()
		.split(/\s+/)
		.filter((token) => token.length >= minLength);
	return removeStopwords(words, eng);
}

/**
 * Wraps each KB document with tokenized title/body fields for Fuse searching.
 * @param docs - The canonical KB documents to prepare
 * @returns Searchable documents carrying tokenized fields and the original doc
 */
function prepareSearchableKbDocs(docs: KbDoc[]): SearchableKbDoc[] {
	return docs.map((doc) => ({
		id: doc.id,
		doc,
		titleTokens: tokenize(doc.title),
		bodyTokens: tokenize(doc.body),
	}));
}

/**
 * Ranks canonical KB documents against a free-text query using token-based fuzzy matching,
 * mirroring `searchRules`: each query token is searched individually, per-token Fuse scores are
 * aggregated per document and normalized to 0-100, and results are sorted highest-first.
 *
 * An empty/stop-word-only query returns all docs with score 0 in their original order.
 * @param query - The agent's free-text search query
 * @param docs - Canonical KB documents to rank (already scope/type filtered)
 * @returns Search results sorted by relevancy score (highest first)
 */
export function searchKbDocs(query: string, docs: KbDoc[]): KbSearchResult[] {
	// No query (or stop-word-only) → return all docs unranked, original order.
	const queryTokens = query.trim() ? tokenize(query) : [];
	if (queryTokens.length === 0) {
		return docs.map((doc) => ({ doc, score: 0 }));
	}

	const searchableDocs = prepareSearchableKbDocs(docs);

	const fuse = new Fuse(searchableDocs, {
		keys: [
			{ name: "titleTokens", weight: 0.6 },
			{ name: "bodyTokens", weight: 0.4 },
		],
		threshold: 0.4,
		includeScore: true,
		minMatchCharLength: 2,
		ignoreLocation: true,
		isCaseSensitive: false,
	});

	// Aggregate per-token scores keyed by the doc's stable string id.
	const docScores = new Map<string, { doc: KbDoc; totalScore: number }>();
	for (const token of queryTokens) {
		for (const result of fuse.search(token)) {
			const id = result.item.id;
			// Fuse score: 0 (perfect) → 1 (poor). Convert to points: 0 → 100, 1 → 0.
			const tokenScore = Math.round((1 - (result.score ?? 1)) * 100);
			const existing = docScores.get(id);
			if (existing) {
				existing.totalScore += tokenScore;
			} else {
				docScores.set(id, { doc: result.item.doc, totalScore: tokenScore });
			}
		}
	}

	// Normalize each aggregate to 0-100 (each token can contribute up to 100 points).
	const maxPossibleScore = queryTokens.length * 100;
	const results: KbSearchResult[] = Array.from(docScores.values()).map(({ doc, totalScore }) => ({
		doc,
		score: Math.min(100, Math.round((totalScore / maxPossibleScore) * 100)),
	}));

	return results.sort((a, b) => b.score - a.score);
}
