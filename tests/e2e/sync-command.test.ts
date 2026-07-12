import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnCLI } from "../helpers/cli-utils";
import { getTestDatabase, seedTestDatabase, storePrivateSkillInTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject, fileExists } from "../helpers/test-setup-utils";

/**
 * E2E coverage for the `sync` command: it installs the FULL available catalog for a project's
 * agent + scope (force-overwrite), rewrites `.ai-rules.json` to match, and — with `--all` —
 * does this for every discovered project under a root. Runs the real CLI against the seeded
 * API server; the subprocess inherits AI_RULES_SECRET=test-secret from setup.ts.
 */
describe("E2E: Sync Command", () => {
	const tempDirs: string[] = [];

	beforeEach(async () => {
		await seedTestDatabase();
	});

	afterEach(async () => {
		while (tempDirs.length > 0) {
			const dir = tempDirs.pop();
			if (dir) await rm(dir, { recursive: true, force: true });
		}
	});

	it("installs the full available catalog into a project and records it in the config", async () => {
		// Given a claude-code project whose config lists nothing yet.
		const projectDir = await createTestProject("sync-full-catalog");
		try {
			const config = { version: "0.1.0", agent: "claude-code", categories: [] };
			await writeFile(join(projectDir, ".ai-rules.json"), JSON.stringify(config));

			// When the developer runs `sync` from inside that project.
			const { result } = spawnCLI(["sync"], { cwd: projectDir, timeout: 60000 });
			const output = await result;
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);

			// Then a file from every catalog kind is materialized on disk, even though the config
			// listed none of them.
			expect(await fileExists(projectDir, ".claude/rules/typescript-conventions.md")).toBe(true);
			expect(await fileExists(projectDir, ".claude/skills/feature-dev-lite/SKILL.md")).toBe(true);
			expect(await fileExists(projectDir, ".agents/workflows/deploy-to-production.md")).toBe(true);

			// And the config is rewritten to record what was installed.
			const written = JSON.parse(await readFile(join(projectDir, ".ai-rules.json"), "utf-8"));
			expect(written.categories).toContain("typescript-conventions");
			expect(written.skills).toContain("feature-dev-lite");
			expect(written.workflows).toContain("deploy-to-production");
		} finally {
			await cleanupTestProject(projectDir);
		}
	});

	it("pulls in a newly-shared private skill the project never listed", async () => {
		// Given a private skill was shared under scope "work" — but the project's config does not
		// mention it (the exact situation sync exists to resolve).
		const db = await getTestDatabase();
		await storePrivateSkillInTestDatabase(
			db,
			"claude-code",
			{ name: "work-secret", content: "---\nname: work-secret\n---\n# Work Secret" },
			["work"],
		);

		const projectDir = await createTestProject("sync-private-skill");
		try {
			const config = { version: "0.1.0", agent: "claude-code", categories: [], skills: [], scope: ["work"] };
			await writeFile(join(projectDir, ".ai-rules.json"), JSON.stringify(config));

			// When the developer runs `sync` (subprocess inherits AI_RULES_SECRET from setup.ts).
			const { result } = spawnCLI(["sync"], { cwd: projectDir, timeout: 60000 });
			const output = await result;
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);

			// Then the private skill is installed with its private content...
			expect(await fileExists(projectDir, ".claude/skills/work-secret/SKILL.md")).toBe(true);
			const installed = await readFile(join(projectDir, ".claude/skills/work-secret/SKILL.md"), "utf-8");
			expect(installed).toBe("---\nname: work-secret\n---\n# Work Secret");

			// ...and the config now records it, so the project's declared set reflects what landed.
			const written = JSON.parse(await readFile(join(projectDir, ".ai-rules.json"), "utf-8"));
			expect(written.skills).toContain("work-secret");
		} finally {
			await cleanupTestProject(projectDir);
		}
	});

	it("does not install a private skill that belongs to a different scope", async () => {
		// Given a private skill shared only under scope "work".
		const db = await getTestDatabase();
		await storePrivateSkillInTestDatabase(
			db,
			"claude-code",
			{ name: "work-only", content: "should never reach client-x" },
			["work"],
		);

		// And a project that belongs to an unrelated scope "client-x".
		const projectDir = await createTestProject("sync-scope-isolation");
		try {
			const config = { version: "0.1.0", agent: "claude-code", categories: [], skills: [], scope: ["client-x"] };
			await writeFile(join(projectDir, ".ai-rules.json"), JSON.stringify(config));

			// When the developer runs `sync`.
			const { result } = spawnCLI(["sync"], { cwd: projectDir, timeout: 60000 });
			const output = await result;
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);

			// Then the out-of-scope private skill is NOT installed and never recorded...
			expect(await fileExists(projectDir, ".claude/skills/work-only/SKILL.md")).toBe(false);
			const written = JSON.parse(await readFile(join(projectDir, ".ai-rules.json"), "utf-8"));
			expect(written.skills).not.toContain("work-only");

			// ...while the public catalog still installs normally.
			expect(await fileExists(projectDir, ".claude/skills/feature-dev-lite/SKILL.md")).toBe(true);
		} finally {
			await cleanupTestProject(projectDir);
		}
	});

	it("syncs every discovered project under a root with --all, skipping dependency folders", async () => {
		// Given a root containing two real projects plus a decoy config buried in node_modules.
		const root = await mkdtemp(join(tmpdir(), "sync-all-"));
		tempDirs.push(root);
		const projectA = join(root, "project-a");
		const projectB = join(root, "team", "project-b");
		const decoy = join(root, "project-a", "node_modules", "pkg");
		await mkdir(projectA, { recursive: true });
		await mkdir(projectB, { recursive: true });
		await mkdir(decoy, { recursive: true });

		const config = JSON.stringify({ version: "0.1.0", agent: "claude-code", categories: [] });
		await writeFile(join(projectA, ".ai-rules.json"), config);
		await writeFile(join(projectB, ".ai-rules.json"), config);
		await writeFile(join(decoy, ".ai-rules.json"), config);

		// When the developer runs `sync --all` pointed at that root.
		const { result } = spawnCLI(["sync", "--all", "--root", root], { cwd: root, timeout: 90000 });
		const output = await result;
		expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);

		// Then both real projects receive the catalog...
		expect(await fileExists(projectA, ".claude/skills/feature-dev-lite/SKILL.md")).toBe(true);
		expect(await fileExists(projectB, ".claude/skills/feature-dev-lite/SKILL.md")).toBe(true);

		// ...the node_modules decoy is never touched...
		expect(await fileExists(decoy, ".claude/skills/feature-dev-lite/SKILL.md")).toBe(false);

		// ...and the run reports a success summary.
		expect(output.stdout).toContain("2 succeeded");
	});

	it("defaults --all to the current working directory when no --root is given", async () => {
		// Given a root with a nested project, and the developer standing inside that root.
		const root = await mkdtemp(join(tmpdir(), "sync-all-cwd-"));
		tempDirs.push(root);
		const nested = join(root, "workspace", "project-a");
		await mkdir(nested, { recursive: true });
		await writeFile(
			join(nested, ".ai-rules.json"),
			JSON.stringify({ version: "0.1.0", agent: "claude-code", categories: [] }),
		);

		// When `sync --all` runs from that root WITHOUT --root, so cwd is the only scan root.
		const { result } = spawnCLI(["sync", "--all"], { cwd: root, timeout: 90000 });
		const output = await result;
		expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);

		// Then the nested project under cwd is synced — proving discovery rooted at cwd, not a
		// hardcoded ancestor path (the regression that synced unrelated sibling repos).
		expect(await fileExists(nested, ".claude/skills/feature-dev-lite/SKILL.md")).toBe(true);
		expect(output.stdout).toContain("1 succeeded");
	});
});
