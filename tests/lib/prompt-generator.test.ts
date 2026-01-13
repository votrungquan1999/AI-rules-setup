import { describe, expect, it } from "vitest";
import type { Manifest } from "src/server/types";
import { generateChatGptPrompt } from "src/lib/prompt-generator";

describe("generateChatGptPrompt", () => {
	/**
	 * Test: Function generates prompt with introduction explaining the task
	 *
	 * Flow:
	 * 1. Call generateChatGptPrompt with sample manifests
	 *
	 * Assertions:
	 * - Prompt includes introduction text
	 * - Prompt explains the task
	 */
	it("should generate prompt with introduction explaining the task", () => {
		const manifests: Manifest[] = [
			{
				id: "typescript-conventions",
				category: "typescript",
				tags: ["typescript", "language"],
				description: "TypeScript conventions",
				whenToUse: "Use when project uses TypeScript",
				files: [{ path: "test.md", description: "Test file" }],
			},
		];

		const prompt = generateChatGptPrompt(manifests, "cursor");

		expect(prompt).toContain("You are helping");
		expect(prompt).toContain("select appropriate AI agent rules");
	});

	/**
	 * Test: Function includes all categories with id, description, tags, and whenToUse
	 *
	 * Flow:
	 * 1. Call generateChatGptPrompt with multiple manifests
	 *
	 * Assertions:
	 * - Prompt includes all category IDs
	 * - Prompt includes all descriptions
	 * - Prompt includes all tags
	 * - Prompt includes all whenToUse fields
	 */
	it("should include all categories with id, description, tags, and whenToUse", () => {
		const manifests: Manifest[] = [
			{
				id: "typescript-conventions",
				category: "typescript",
				tags: ["typescript", "language"],
				description: "TypeScript conventions",
				whenToUse: "Use when project uses TypeScript",
				files: [{ path: "test.md", description: "Test file" }],
			},
			{
				id: "react-server-components",
				category: "react",
				tags: ["react", "nextjs"],
				description: "React Server Components rules",
				whenToUse: "Use when building React apps with Next.js",
				files: [{ path: "test.md", description: "Test file" }],
			},
		];

		const prompt = generateChatGptPrompt(manifests, "cursor");

		expect(prompt).toContain("typescript-conventions");
		expect(prompt).toContain("TypeScript conventions");
		expect(prompt).toContain("typescript");
		expect(prompt).toContain("Use when project uses TypeScript");

		expect(prompt).toContain("react-server-components");
		expect(prompt).toContain("React Server Components rules");
		expect(prompt).toContain("react");
		expect(prompt).toContain("Use when building React apps with Next.js");
	});

	/**
	 * Test: Function includes instructions for ChatGPT to ask questions
	 *
	 * Flow:
	 * 1. Call generateChatGptPrompt with sample manifests
	 *
	 * Assertions:
	 * - Prompt includes instructions to ask questions
	 * - Prompt mentions understanding the project
	 */
	it("should include instructions for ChatGPT to ask questions", () => {
		const manifests: Manifest[] = [
			{
				id: "typescript-conventions",
				category: "typescript",
				tags: ["typescript"],
				description: "TypeScript conventions",
				whenToUse: "Use when project uses TypeScript",
				files: [{ path: "test.md", description: "Test file" }],
			},
		];

		const prompt = generateChatGptPrompt(manifests, "cursor");

		expect(prompt.toLowerCase()).toMatch(/ask.*question/i);
		expect(prompt.toLowerCase()).toMatch(/understand.*project/i);
	});

	/**
	 * Test: Function includes instructions to output CLI command format
	 *
	 * Flow:
	 * 1. Call generateChatGptPrompt with sample manifests
	 *
	 * Assertions:
	 * - Prompt includes CLI command format
	 * - Prompt includes npx command
	 * - Prompt includes --agent and --categories flags
	 */
	it("should include instructions to output CLI command format", () => {
		const manifests: Manifest[] = [
			{
				id: "typescript-conventions",
				category: "typescript",
				tags: ["typescript"],
				description: "TypeScript conventions",
				whenToUse: "Use when project uses TypeScript",
				files: [{ path: "test.md", description: "Test file" }],
			},
		];

		const prompt = generateChatGptPrompt(manifests, "cursor");

		expect(prompt).toContain("npx @quanvo99/ai-rules@latest init");
		expect(prompt).toContain("--agent");
		expect(prompt).toContain("--categories");
	});

	/**
	 * Test: Function handles empty manifests array gracefully
	 *
	 * Flow:
	 * 1. Call generateChatGptPrompt with empty array
	 *
	 * Assertions:
	 * - Function does not throw error
	 * - Prompt is still generated (may be empty or have structure)
	 */
	it("should handle empty manifests array gracefully", () => {
		const manifests: Manifest[] = [];

		expect(() => generateChatGptPrompt(manifests, "cursor")).not.toThrow();
	});

	/**
	 * Test: Function correctly formats agent name in CLI command
	 *
	 * Flow:
	 * 1. Call generateChatGptPrompt with different agent names
	 *
	 * Assertions:
	 * - Prompt includes correct agent name in CLI command example
	 */
	it("should correctly format agent name in CLI command", () => {
		const manifests: Manifest[] = [
			{
				id: "typescript-conventions",
				category: "typescript",
				tags: ["typescript"],
				description: "TypeScript conventions",
				whenToUse: "Use when project uses TypeScript",
				files: [{ path: "test.md", description: "Test file" }],
			},
		];

		const promptCursor = generateChatGptPrompt(manifests, "cursor");
		const promptWindsurf = generateChatGptPrompt(manifests, "windsurf");

		expect(promptCursor).toContain("--agent cursor");
		expect(promptWindsurf).toContain("--agent windsurf");
	});

	/**
	 * Test: Function orders categories consistently (alphabetically by id)
	 *
	 * Flow:
	 * 1. Call generateChatGptPrompt with manifests in different order
	 *
	 * Assertions:
	 * - Categories appear in alphabetical order by id
	 */
	it("should order categories consistently (alphabetically by id)", () => {
		const manifests: Manifest[] = [
			{
				id: "z-category",
				category: "z",
				tags: ["z"],
				description: "Z category",
				whenToUse: "Use for Z",
				files: [{ path: "test.md", description: "Test file" }],
			},
			{
				id: "a-category",
				category: "a",
				tags: ["a"],
				description: "A category",
				whenToUse: "Use for A",
				files: [{ path: "test.md", description: "Test file" }],
			},
			{
				id: "m-category",
				category: "m",
				tags: ["m"],
				description: "M category",
				whenToUse: "Use for M",
				files: [{ path: "test.md", description: "Test file" }],
			},
		];

		const prompt = generateChatGptPrompt(manifests, "cursor");

		const aIndex = prompt.indexOf("a-category");
		const mIndex = prompt.indexOf("m-category");
		const zIndex = prompt.indexOf("z-category");

		expect(aIndex).toBeLessThan(mIndex);
		expect(mIndex).toBeLessThan(zIndex);
	});
});

