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
		it("should detect no conflict when file does not exist", async () => {
			const result = await detectConflict(join(testDir, "non-existent.md"));

			expect(result.hasConflict).toBe(false);
		});

		it("should detect conflict when file exists", async () => {
			const filePath = join(testDir, "existing-rule.md");
			await writeFile(filePath, "existing content", "utf-8");

			const result = await detectConflict(filePath);

			expect(result.hasConflict).toBe(true);
		});

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
		it("should write file to specified path", async () => {
			const filePath = join(testDir, "new-rule.md");
			const content = "# New Rule\n\nThis is a test rule.";

			await writeRuleFile(content, filePath);

			const writtenContent = await readFile(filePath, "utf-8");
			expect(writtenContent).toBe(content);
		});

		it("should create directory structure if it does not exist", async () => {
			const filePath = join(testDir, "nested", "deep", "rule.md");
			const content = "# Nested Rule\n\nThis is a nested rule.";

			await writeRuleFile(content, filePath);

			const writtenContent = await readFile(filePath, "utf-8");
			expect(writtenContent).toBe(content);
		});

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
		it("should apply Cursor naming convention", () => {
			const result = applyNamingConvention(AIAgent.CURSOR, "typescript", "typescript-conventions.mdc");

			expect(result).toBe(".cursor/rules/typescript-conventions.md");
		});

		it("should apply Windsurf naming convention", () => {
			const result = applyNamingConvention(AIAgent.WINDSURF, "typescript", "typescript-conventions.mdc");

			expect(result).toBe(".windsurf/rules/typescript.windsurfrules");
		});

		it("should apply Aider naming convention", () => {
			const result = applyNamingConvention(AIAgent.AIDER, "typescript", "typescript-conventions.mdc");

			expect(result).toBe(".aider/rules/typescript-conventions.md");
		});

		it("should apply Continue naming convention", () => {
			const result = applyNamingConvention(AIAgent.CONTINUE, "typescript", "typescript-conventions.mdc");

			expect(result).toBe(".continue/rules/typescript-conventions.md");
		});

		it("should apply Cody naming convention", () => {
			const result = applyNamingConvention(AIAgent.CODY, "typescript", "typescript-conventions.mdc");

			expect(result).toBe(".cody/rules/typescript-conventions.md");
		});

		it("should handle different file extensions", () => {
			const result = applyNamingConvention(AIAgent.CURSOR, "react", "server-components-rules.mdc");

			expect(result).toBe(".cursor/rules/server-components-rules.md");
		});

		it("should handle category with hyphens", () => {
			const result = applyNamingConvention(AIAgent.CURSOR, "react-server-components", "rules.mdc");

			expect(result).toBe(".cursor/rules/rules.md");
		});
	});
});
