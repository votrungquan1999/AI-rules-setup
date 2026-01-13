import { extractManifestsForAgent } from "src/lib/rules-data-utils";
import type { RulesData } from "src/server/types";
import { describe, expect, it } from "vitest";

/**
 * Test scenarios for Step 1: Pass Complete Rules Data to Client Components
 *
 * Test 1: Extract manifests for a specific agent from complete rules data
 */

describe("Rules Data Utilities", () => {
	describe("extractManifestsForAgent", () => {
		it("should extract manifests for cursor agent when cursor data exists", () => {
			const rulesData: RulesData = {
				agents: {
					cursor: {
						categories: {
							typescript: {
								manifest: {
									id: "typescript",
									category: "typescript",
									tags: ["typescript"],
									description: "TypeScript rules",
									whenToUse: "When using TypeScript",
									files: [],
								},
								files: [],
							},
						},
					},
				},
			};

			const manifests = extractManifestsForAgent(rulesData, "cursor");

			expect(manifests).toHaveLength(1);
			expect(manifests[0]?.id).toBe("typescript");
		});

		it("should extract manifests for claude-code agent when multiple agents exist", () => {
			const rulesData: RulesData = {
				agents: {
					cursor: {
						categories: {
							typescript: {
								manifest: {
									id: "typescript",
									category: "typescript",
									tags: ["typescript"],
									description: "TypeScript rules",
									whenToUse: "When using TypeScript",
									files: [],
								},
								files: [],
							},
						},
					},
					"claude-code": {
						categories: {
							react: {
								manifest: {
									id: "react",
									category: "react",
									tags: ["react"],
									description: "React rules",
									whenToUse: "When using React",
									files: [],
								},
								files: [],
							},
						},
					},
				},
			};

			const manifests = extractManifestsForAgent(rulesData, "claude-code");

			expect(manifests).toHaveLength(1);
			expect(manifests[0]?.id).toBe("react");
		});

		it("should return empty array when agent does not exist", () => {
			const rulesData: RulesData = {
				agents: {
					cursor: {
						categories: {},
					},
				},
			};

			const manifests = extractManifestsForAgent(rulesData, "nonexistent");

			expect(manifests).toHaveLength(0);
		});
	});
});
