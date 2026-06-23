import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverConfigDirs } from "../../src/cli/lib/discover";

describe("discoverConfigDirs", () => {
	let root: string;

	beforeEach(async () => {
		// mkdtemp guarantees a unique dir so concurrent test files never share filesystem state.
		root = await mkdtemp(join(tmpdir(), "discover-test-"));
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it("returns every directory containing .ai-rules.json (recursively) while skipping node_modules and .git", async () => {
		// Given: a tree with configs at varying depths, plus decoy configs inside node_modules/.git
		const repoA = join(root, "repo-a");
		const repoB = join(root, "group", "repo-b");
		const nodeModulesDecoy = join(root, "repo-a", "node_modules", "pkg");
		const gitDecoy = join(root, "group", ".git", "hooks");
		const noConfigDir = join(root, "group", "empty-dir");

		await mkdir(repoA, { recursive: true });
		await mkdir(repoB, { recursive: true });
		await mkdir(nodeModulesDecoy, { recursive: true });
		await mkdir(gitDecoy, { recursive: true });
		await mkdir(noConfigDir, { recursive: true });

		const cfg = JSON.stringify({ version: "1.0.0", agent: "claude-code", categories: [] });
		await writeFile(join(repoA, ".ai-rules.json"), cfg);
		await writeFile(join(repoB, ".ai-rules.json"), cfg);
		await writeFile(join(nodeModulesDecoy, ".ai-rules.json"), cfg);
		await writeFile(join(gitDecoy, ".ai-rules.json"), cfg);

		// When
		const found = await discoverConfigDirs(root);

		// Then: exactly the two real repo dirs, decoys and config-less dirs excluded
		expect([...found].sort()).toEqual([repoA, repoB].sort());
	});
});
