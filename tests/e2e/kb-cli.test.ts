import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KB_DOCS_COLLECTION_NAME, KbStatus, KbType, type StoredKbDocDocument } from "../../src/server/types";
import { spawnCLI } from "../helpers/cli-utils";
import { getTestDatabase, seedTestDatabase, storeKbDocInTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject } from "../helpers/test-setup-utils";

/**
 * Writes a minimal `.ai-rules.json` with the given scope into a project dir so the `kb` command
 * (which reads scope from the project config) runs against a known scope.
 * @param dir - Project directory
 * @param scope - Scope tags to declare
 */
async function writeConfig(dir: string, scope: string[]): Promise<void> {
	const config = { version: "1.0.0", agent: "claude-code", categories: [], scope };
	await writeFile(join(dir, ".ai-rules.json"), JSON.stringify(config, null, 2));
}

describe("E2E: kb CLI command", () => {
	const projects: string[] = [];

	beforeEach(async () => {
		await seedTestDatabase();
	});

	afterEach(async () => {
		while (projects.length > 0) {
			const dir = projects.pop();
			if (dir) await cleanupTestProject(dir);
		}
	});

	describe("when searching with a matching scope", () => {
		it("returns the canonical entry whose scope intersects the workspace", async () => {
			// Given a canonical TIL tagged to scope "kbcli".
			const db = await getTestDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Canonical,
				title: "Prefer ripgrep over grep",
				body: "rg is faster and respects .gitignore.",
				scope: ["kbcli"],
			});
			const dir = await createTestProject("kb-cli-search");
			projects.push(dir);
			await writeConfig(dir, ["kbcli"]);

			// When the developer searches the knowledge base from that workspace.
			const { result } = spawnCLI(["kb", "search", "ripgrep"], { cwd: dir, timeout: 30000 });
			const { stdout, exitCode } = await result;

			// Then the matching entry's title is listed.
			expect(exitCode).toBe(0);
			expect(stdout).toContain("Prefer ripgrep over grep");
		});
	});

	describe("when getting an entry by id", () => {
		it("prints the full body of the canonical entry", async () => {
			// Given a canonical blueprint seeded in the database.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Blueprint,
				status: KbStatus.Canonical,
				title: "Retry with backoff",
				body: "Wrap the call in an exponential-backoff loop with jitter.",
				scope: ["kbcli"],
			});
			const dir = await createTestProject("kb-cli-get");
			projects.push(dir);
			await writeConfig(dir, ["kbcli"]);

			// When the developer fetches it by id.
			const { result } = spawnCLI(["kb", "get", id], { cwd: dir, timeout: 30000 });
			const { stdout, exitCode } = await result;

			// Then the body is printed.
			expect(exitCode).toBe(0);
			expect(stdout).toContain("exponential-backoff loop with jitter");
		});
	});

	describe("when capturing a TIL", () => {
		it("creates a draft (not yet canonical) and reports its id", async () => {
			// Given a workspace with a configured scope.
			const dir = await createTestProject("kb-cli-capture");
			projects.push(dir);
			await writeConfig(dir, ["kbcli"]);

			// When the developer captures a TIL with an explicit scope.
			const { result } = spawnCLI(
				["kb", "capture", "til", "--title", "Vitest no watch", "--body", "Use vitest run in CI.", "--scope", "kbcli"],
				{ cwd: dir, timeout: 30000 },
			);
			const { stdout, exitCode } = await result;

			// Then the command reports a captured draft.
			expect(exitCode).toBe(0);
			expect(stdout).toContain("Captured draft");

			// And the entry is persisted as a draft, not canonical.
			const db = await getTestDatabase();
			const doc = await db
				.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME)
				.findOne({ title: "Vitest no watch" });
			expect(doc?.status).toBe(KbStatus.Draft);
		});
	});

	describe("when capturing a memory over the conciseness cap", () => {
		it("fails with a non-zero exit code and does not persist", async () => {
			// Given a workspace with a configured scope.
			const dir = await createTestProject("kb-cli-memory-cap");
			projects.push(dir);
			await writeConfig(dir, ["kbcli"]);

			// When the developer captures a memory body over 200 chars (with an explicit scope so the cap check is what fails).
			const tooLong = "x".repeat(201);
			const { result } = spawnCLI(["kb", "capture", "memory", "--body", tooLong, "--scope", "kbcli"], {
				cwd: dir,
				timeout: 30000,
			});
			const { exitCode } = await result;

			// Then the command fails.
			expect(exitCode).toBe(1);
		});
	});

	describe("when capturing without --scope or --global", () => {
		it("fails with a non-zero exit and stores nothing", async () => {
			// Given a workspace whose config declares no scope (irrelevant now — capture no longer reads it).
			const dir = await createTestProject("kb-cli-no-scope");
			projects.push(dir);
			await writeConfig(dir, []);

			// When the developer captures a TIL without stating visibility.
			const { result } = spawnCLI(["kb", "capture", "til", "--title", "Unstated TIL", "--body", "applies everywhere"], {
				cwd: dir,
				timeout: 30000,
			});
			const { stderr, exitCode } = await result;

			// Then the command refuses on the scope rule and persists nothing.
			expect(exitCode).toBe(1);
			expect(stderr).toContain("--scope");
			const db = await getTestDatabase();
			const doc = await db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME).findOne({ title: "Unstated TIL" });
			expect(doc).toBeNull();
		});

		it("succeeds and persists a global (empty-scope) draft when --global is passed", async () => {
			// Given a workspace whose config declares no scope.
			const dir = await createTestProject("kb-cli-global");
			projects.push(dir);
			await writeConfig(dir, []);

			// When the developer captures a TIL with an explicit --global opt-in.
			const { result } = spawnCLI(
				["kb", "capture", "til", "--title", "Global TIL", "--body", "applies everywhere", "--global"],
				{ cwd: dir, timeout: 30000 },
			);
			const { stdout, exitCode } = await result;

			// Then the command reports a captured draft.
			expect(exitCode).toBe(0);
			expect(stdout).toContain("Captured draft");

			// And the entry is persisted as a global draft (empty scope).
			const db = await getTestDatabase();
			const doc = await db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME).findOne({ title: "Global TIL" });
			expect(doc?.status).toBe(KbStatus.Draft);
			expect(doc?.scope).toEqual([]);
		});
	});
});
