import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ObjectId } from "mongodb";
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

	describe("when updating an entry", () => {
		it("updates only the title via --title, leaving the body intact", async () => {
			// Given a canonical TIL seeded in the database.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Canonical,
				title: "Original title",
				body: "Original body content.",
				scope: ["kbcli"],
			});

			// When the developer updates only the title.
			const { result } = spawnCLI(["kb", "update", id, "--title", "Renamed title"], { timeout: 30000 });
			const output = await result;

			// Then the CLI exits cleanly and the body is preserved.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);
			const after = await db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME).findOne({
				_id: new ObjectId(id),
			});
			expect(after?.title).toBe("Renamed title");
			expect(after?.body).toBe("Original body content.");
			expect(after?.scope).toEqual(["kbcli"]);
		});

		it("refuses with a non-zero exit when no editable field is given", async () => {
			// Given a canonical entry seeded in the database.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Canonical,
				title: "Untouched title",
				body: "Untouched body.",
				scope: ["kbcli"],
			});

			// When the developer runs `kb update <id>` with no editable flag.
			const { result } = spawnCLI(["kb", "update", id], { timeout: 30000 });
			const output = await result;

			// Then the command refuses and nothing changes.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).not.toBe(0);
			// The client-side pre-check message, not the server's generic 400 body — proves the
			// request was refused before ever reaching the network.
			expect(output.stderr).toContain("Provide at least one of");
			const after = await db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME).findOne({
				_id: new ObjectId(id),
			});
			expect(after?.title).toBe("Untouched title");
		});

		it("exits non-zero when the id is unknown", async () => {
			// When the developer updates an id that doesn't exist.
			const { result } = spawnCLI(["kb", "update", "000000000000000000000000", "--title", "whatever"], {
				timeout: 30000,
			});
			const output = await result;

			// Then the command fails.
			expect(output.exitCode).not.toBe(0);
		});

		it("updates the scope via --scope, replacing the previous scope tags", async () => {
			// Given a canonical entry seeded in the database.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Canonical,
				title: "Scope target",
				body: "Body content.",
				scope: ["kbcli"],
			});

			// When the developer updates the scope.
			const { result } = spawnCLI(["kb", "update", id, "--scope", "kbcli,other"], { timeout: 30000 });
			const output = await result;

			// Then the CLI exits cleanly and the scope is replaced.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);
			const after = await db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME).findOne({
				_id: new ObjectId(id),
			});
			expect(after?.scope).toEqual(["kbcli", "other"]);
		});

		it("clears the scope to global via --global", async () => {
			// Given a canonical entry seeded in the database.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Canonical,
				title: "Global target",
				body: "Body content.",
				scope: ["kbcli"],
			});

			// When the developer clears the scope to global.
			const { result } = spawnCLI(["kb", "update", id, "--global"], { timeout: 30000 });
			const output = await result;

			// Then the CLI exits cleanly and the scope is empty.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);
			const after = await db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME).findOne({
				_id: new ObjectId(id),
			});
			expect(after?.scope).toEqual([]);
		});

		it("refuses with a non-zero exit when --scope and --global are passed together", async () => {
			// Given a canonical entry seeded in the database.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Canonical,
				title: "Conflict target",
				body: "Body content.",
				scope: ["kbcli"],
			});

			// When the developer passes both --scope and --global.
			const { result } = spawnCLI(["kb", "update", id, "--scope", "kbcli", "--global"], { timeout: 30000 });
			const output = await result;

			// Then the command fails.
			expect(output.exitCode).not.toBe(0);
		});

		it("updates the body via --body, leaving the title intact", async () => {
			// Given a canonical entry seeded in the database.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Canonical,
				title: "Body target",
				body: "Original body.",
				scope: ["kbcli"],
			});

			// When the developer updates only the body.
			const { result } = spawnCLI(["kb", "update", id, "--body", "new body"], { timeout: 30000 });
			const output = await result;

			// Then the CLI exits cleanly and the title is preserved.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);
			const after = await db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME).findOne({
				_id: new ObjectId(id),
			});
			expect(after?.body).toBe("new body");
			expect(after?.title).toBe("Body target");
		});

		it("updates the body from a file via --body-file", async () => {
			// Given a canonical entry seeded in the database.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Canonical,
				title: "Body file target",
				body: "Original body.",
				scope: ["kbcli"],
			});
			const dir = await createTestProject("kb-cli-update-body-file");
			projects.push(dir);
			const bodyFilePath = join(dir, "body.txt");
			await writeFile(bodyFilePath, "body from file");

			// When the developer updates the body from a file.
			const { result } = spawnCLI(["kb", "update", id, "--body-file", bodyFilePath], { timeout: 30000 });
			const output = await result;

			// Then the CLI exits cleanly and the body matches the file contents.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);
			const after = await db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME).findOne({
				_id: new ObjectId(id),
			});
			expect(after?.body).toBe("body from file");
		});
	});

	describe("when deleting an entry", () => {
		it("deletes an entry by id, leaving it gone from storage", async () => {
			// Given a canonical entry seeded in the database.
			const db = await getTestDatabase();
			const id = await storeKbDocInTestDatabase(db, {
				type: KbType.Til,
				status: KbStatus.Canonical,
				title: "Delete target",
				body: "Should be removed.",
				scope: ["kbcli"],
			});

			// When the developer deletes it by id.
			const { result } = spawnCLI(["kb", "delete", id], { timeout: 30000 });
			const output = await result;

			// Then the CLI exits cleanly and the doc is gone.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);
			const after = await db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME).findOne({
				_id: new ObjectId(id),
			});
			expect(after).toBeNull();
		});

		it("exits non-zero when the id is unknown", async () => {
			// When the developer deletes an id that doesn't exist.
			const { result } = spawnCLI(["kb", "delete", "000000000000000000000000"], { timeout: 30000 });
			const output = await result;

			// Then the command fails.
			expect(output.exitCode).not.toBe(0);
		});
	});
});
