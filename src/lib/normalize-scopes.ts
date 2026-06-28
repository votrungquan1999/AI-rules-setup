/**
 * Cleans a reviewer-entered scope list before it is saved: trims surrounding whitespace, drops
 * empty entries, and removes duplicates while preserving the original casing and order. Shared by
 * the KB review, KB browse, and private-skills editors (extracted at the 3rd use per the project's
 * "extract only at 3+ uses" rule).
 * @param scopes - The raw scope tags from the editor
 * @returns The normalized scope tags
 */
export function normalizeScopes(scopes: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const raw of scopes) {
		const tag = raw.trim();
		if (tag.length === 0 || seen.has(tag)) continue;
		seen.add(tag);
		result.push(tag);
	}
	return result;
}
