import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyNamingConvention, detectConflict, writeRuleFile } from "../../src/cli/lib/files";
import { AIAgent } from "../../src/cli/lib/types";

describe("File Utilities", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = join(process.cwd(), "test-projects", "file-utils-test");
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("detectConflict", () => {
		/**
		 * Test: Detect no conflict when file does not exist
		 *
		 * Flow:
		 * 1. Call detectConflict with non-existent file path
		 *
		 * Assertions:
		 * - hasConflict should be false
		 */
		it("should detect no conflict when file does not exist", async () => {
			const result = await detectConflict(join(testDir, "non-existent.md"));

			expect(result.hasConflict).toBe(false);
		});

		/**
		 * Test: Detect conflict when file exists
		 *
		 * Flow:
		 * 1. Create a file with content
		 * 2. Call detectConflict with existing file path
		 *
		 * Assertions:
		 * - hasConflict should be true
		 */
		it("should detect conflict when file exists", async () => {
			const filePath = join(testDir, "existing-rule.md");
			await writeFile(filePath, "existing content", "utf-8");

			const result = await detectConflict(filePath);

			expect(result.hasConflict).toBe(true);
		});

		/**
		 * Test: Detect conflict for nested file path
		 *
		 * Flow:
		 * 1. Create nested directory structure
		 * 2. Create a file in nested directory
		 * 3. Call detectConflict with nested file path
		 *
		 * Assertions:
		 * - hasConflict should be true
		 */
		it("should detect conflict for nested file path", async () => {
			const nestedDir = join(testDir, "nested", "directory");
			await mkdir(nestedDir, { recursive: true });
			const filePath = join(nestedDir, "rule.md");
			await writeFile(filePath, "existing content", "utf-8");

			const result = await detectConflict(filePath);

			expect(result.hasConflict).toBe(true);
		});
	});

	describe("writeRuleFile", () => {
		/**
		 * Test: Write file to specified path
		 *
		 * Flow:
		 * 1. Define file path and content
		 * 2. Call writeRuleFile with path and content
		 * 3. Read the written file
		 *
		 * Assertions:
		 * - File content matches expected content
		 */
		it("should write file to specified path", async () => {
			const filePath = join(testDir, "new-rule.md");
			const content = "# New Rule\n\nThis is a test rule.";

			await writeRuleFile(content, filePath);

			const writtenContent = await readFile(filePath, "utf-8");
			expect(writtenContent).toBe(content);
		});

		/**
		 * Test: Create directory structure if it does not exist
		 *
		 * Flow:
		 * 1. Define nested file path
		 * 2. Call writeRuleFile with nested path
		 * 3. Read the written file
		 *
		 * Assertions:
		 * - Directory structure created automatically
		 * - File content matches expected content
		 */
		it("should create directory structure if it does not exist", async () => {
			const filePath = join(testDir, "nested", "deep", "rule.md");
			const content = "# Nested Rule\n\nThis is a nested rule.";

			await writeRuleFile(content, filePath);

			const writtenContent = await readFile(filePath, "utf-8");
			expect(writtenContent).toBe(content);
		});

		/**
		 * Test: Overwrite existing file
		 *
		 * Flow:
		 * 1. Create file with original content
		 * 2. Call writeRuleFile with new content
		 * 3. Read the file
		 *
		 * Assertions:
		 * - File content is overwritten with new content
		 */
		it("should overwrite existing file", async () => {
			const filePath = join(testDir, "overwrite-test.md");
			const originalContent = "original content";
			const newContent = "new content";

			// Write original content
			await writeFile(filePath, originalContent, "utf-8");

			// Overwrite with new content
			await writeRuleFile(newContent, filePath);

			const finalContent = await readFile(filePath, "utf-8");
			expect(finalContent).toBe(newContent);
		});
	});

	describe("applyNamingConvention", () => {
		/**
		 * Test: Apply Cursor naming convention
		 *
		 * Flow:
		 * 1. Call applyNamingConvention with CURSOR agent and filename
		 *
		 * Assertions:
		 * - Result should be .cursor/rules/filename
		 */
		it("should apply Cursor naming convention", () => {
			const result = applyNamingConvention(AIAgent.CURSOR, "typescript-conventions.mdc");

			expect(result).toBe(".cursor/rules/typescript-conventions.mdc");
		});

		/**
		 * Test: Apply Windsurf naming convention
		 *
		 * Flow:
		 * 1. Call applyNamingConvention with WINDSURF agent and filename
		 *
		 * Assertions:
		 * - Result should be .windsurf/rules/filename
		 */
		it("should apply Windsurf naming convention", () => {
			const result = applyNamingConvention(AIAgent.WINDSURF, "typescript-conventions.mdc");

			expect(result).toBe(".windsurf/rules/typescript-conventions.mdc");
		});

		/**
		 * Test: Apply Aider naming convention
		 *
		 * Flow:
		 * 1. Call applyNamingConvention with AIDER agent and filename
		 *
		 * Assertions:
		 * - Result should be .aider/rules/filename
		 */
		it("should apply Aider naming convention", () => {
			const result = applyNamingConvention(AIAgent.AIDER, "typescript-conventions.mdc");

			expect(result).toBe(".aider/rules/typescript-conventions.mdc");
		});

		/**
		 * Test: Apply Continue naming convention
		 *
		 * Flow:
		 * 1. Call applyNamingConvention with CONTINUE agent and filename
		 *
		 * Assertions:
		 * - Result should be .continue/rules/filename
		 */
		it("should apply Continue naming convention", () => {
			const result = applyNamingConvention(AIAgent.CONTINUE, "typescript-conventions.mdc");

			expect(result).toBe(".continue/rules/typescript-conventions.mdc");
		});

		/**
		 * Test: Apply Cody naming convention
		 *
		 * Flow:
		 * 1. Call applyNamingConvention with CODY agent and filename
		 *
		 * Assertions:
		 * - Result should be .cody/rules/filename
		 */
		it("should apply Cody naming convention", () => {
			const result = applyNamingConvention(AIAgent.CODY, "typescript-conventions.mdc");

			expect(result).toBe(".cody/rules/typescript-conventions.mdc");
		});

		/**
		 * Test: Handle different file extensions
		 *
		 * Flow:
		 * 1. Call applyNamingConvention with different file extension
		 *
		 * Assertions:
		 * - Result should preserve file extension
		 */
		it("should handle different file extensions", () => {
			const result = applyNamingConvention(AIAgent.CURSOR, "server-components-rules.mdc");

			expect(result).toBe(".cursor/rules/server-components-rules.mdc");
		});

		/**
		 * Test: Handle category with hyphens
		 *
		 * Flow:
		 * 1. Call applyNamingConvention with filename containing hyphens
		 *
		 * Assertions:
		 * - Result should handle hyphens correctly
		 */
		it("should handle category with hyphens", () => {
			const result = applyNamingConvention(AIAgent.CURSOR, "rules.mdc");

			expect(result).toBe(".cursor/rules/rules.mdc");
		});

		/**
		 * Test: Preserve original file extensions
		 *
		 * Flow:
		 * 1. Call applyNamingConvention with .md extension
		 *
		 * Assertions:
		 * - Result should preserve .md extension
		 */
		it("should preserve original file extensions", () => {
			const result = applyNamingConvention(AIAgent.CURSOR, "test-file.md");

			expect(result).toBe(".cursor/rules/test-file.md");
		});
	});
});
