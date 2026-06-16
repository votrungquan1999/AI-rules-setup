import { describe, expect, it } from "vitest";
import { searchKbDocs } from "../../src/lib/kb-search";
import { type KbDoc, KbStatus, KbType } from "../../src/server/types";

/**
 * Builds a canonical KbDoc with sensible defaults for ranking tests.
 * @param overrides - Fields to override (id, title, body, type)
 * @returns A fully-formed canonical KbDoc
 */
function makeDoc(overrides: Partial<KbDoc> & { id: string }): KbDoc {
	return {
		type: KbType.Question,
		status: KbStatus.Canonical,
		title: "",
		body: "",
		scope: ["work"],
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("searchKbDocs", () => {
	it("ranks the document that best matches the query first", () => {
		// Arrange: one doc squarely about the query, one only loosely related.
		const docs: KbDoc[] = [
			makeDoc({ id: "unrelated", title: "Deploying containers", body: "kubernetes pods and nodes" }),
			makeDoc({ id: "relevant", title: "Fixing database connection timeout", body: "database pool timeout retries" }),
		];

		// Act
		const results = searchKbDocs("database timeout", docs);

		// Assert: the strongly-matching doc is ranked first (non-matching docs are dropped, like searchRules).
		expect(results.length).toBeGreaterThan(0);
		expect(results[0]?.doc.id).toBe("relevant");
	});

	it("returns all docs with score 0 in original order when the query is empty", () => {
		// Arrange
		const docs: KbDoc[] = [
			makeDoc({ id: "first", title: "First", body: "one" }),
			makeDoc({ id: "second", title: "Second", body: "two" }),
		];

		// Act
		const results = searchKbDocs("   ", docs);

		// Assert: every doc is returned, unranked, preserving input order.
		expect(results.map((r) => r.doc.id)).toEqual(["first", "second"]);
		expect(results.every((r) => r.score === 0)).toBe(true);
	});

	it("normalizes scores into the 0-100 range", () => {
		// Arrange: a doc that matches every query token strongly.
		const docs: KbDoc[] = [makeDoc({ id: "match", title: "database timeout pool", body: "database timeout pool" })];

		// Act
		const results = searchKbDocs("database timeout", docs);

		// Assert: the matched doc has a normalized score within bounds, not a raw token sum.
		expect(results).toHaveLength(1);
		const score = results[0]?.score ?? -1;
		expect(score).toBeGreaterThan(0);
		expect(score).toBeLessThanOrEqual(100);
	});
});
