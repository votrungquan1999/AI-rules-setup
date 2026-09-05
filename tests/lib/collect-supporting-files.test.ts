import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectSupportingFiles } from "../../src/app/api/lib/local-fetcher";

describe("collectSupportingFiles", () => {
	const tempDirs: string[] = [];

	afterEach(async () => {
		while (tempDirs.length > 0) {
			const dir = tempDirs.pop();
			if (dir) await rm(dir, { recursive: true, force: true });
		}
	});

	/**
	 * Materializes a skill directory from a path -> content map so each test declares exactly the
	 * folder shape it needs. Real files on disk, because the collector walks the filesystem.
	 * @param files - Map of skill-relative path to file content
	 * @returns Absolute path to the created skill directory
	 */
	async function createSkillDir(files: Record<string, string>): Promise<string> {
		const dir = await mkdtemp(join(tmpdir(), "skill-collect-"));
		tempDirs.push(dir);
		for (const [relativePath, content] of Object.entries(files)) {
			const fullPath = join(dir, relativePath);
			await mkdir(dirname(fullPath), { recursive: true });
			await writeFile(fullPath, content);
		}
		return dir;
	}

	it("should exclude junk files and directories that no skill should publish", async () => {
		// Arrange: a skill folder polluted with the junk a real working directory accumulates
		const skillDir = await createSkillDir({
			"SKILL.md": "# Skill",
			"reference.md": "# Reference",
			".DS_Store": "finder junk",
			"node_modules/pkg/index.js": "module.exports = {}",
		});

		// Act
		const files = await collectSupportingFiles(skillDir, skillDir);

		// Assert: only the author's own file survives, with no configuration
		expect(files.map((file) => file.path).sort()).toEqual(["reference.md"]);
	});

	it("should exclude the files and directories named by the author's skill.ignore", async () => {
		// Arrange: the author marks a draft file and a whole scratch directory as unpublishable
		const skillDir = await createSkillDir({
			"SKILL.md": "# Skill",
			"keep.md": "# Keep",
			"draft.md": "# Draft",
			"scratch/notes.md": "# Notes",
			"skill.ignore": "draft.md\nscratch/\n",
		});

		// Act
		const files = await collectSupportingFiles(skillDir, skillDir);

		// Assert: the excluded pair is gone; skill.ignore itself ships so installed copies keep the rules
		expect(files.map((file) => file.path).sort()).toEqual(["keep.md", "skill.ignore"]);
	});

	it("should let a negation in skill.ignore re-include a file the built-in rules drop", async () => {
		// Arrange: *.pyc is junk by default, but this skill ships one deliberately as a fixture
		const skillDir = await createSkillDir({
			"SKILL.md": "# Skill",
			"fixtures/sample.pyc": "compiled fixture",
			"skill.ignore": "!fixtures/sample.pyc\n",
		});

		// Act
		const files = await collectSupportingFiles(skillDir, skillDir);

		// Assert: the author's rules are applied after the defaults, so they can override them
		expect(files.map((file) => file.path).sort()).toEqual(["fixtures/sample.pyc", "skill.ignore"]);
	});
});
