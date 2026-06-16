import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KbStatus, KbType } from "../../src/server/types";
import { spawnCLI } from "../helpers/cli-utils";
import { getTestDatabase, seedTestDatabase, storeKbDocInTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject, fileExists } from "../helpers/test-setup-utils";

const MANAGED_HEADER = "<!-- DO NOT EDIT — managed by ai-rules pull. Overwritten on next pull. -->";

describe("E2E: KB Memory materialization on pull", () => {
	beforeEach(async () => {
		await seedTestDatabase();
	});

	afterEach(async () => {
		const db = await getTestDatabase();
		await db.collection("kb_docs").deleteMany({});
	});

	describe("when a claude-code project with a matching scope pulls", () => {
		it("materializes canonical memories into .claude/rules/kb-memory.md with the managed header", async () => {
			// Given a canonical memory exists for scope "work".
			const db = await getTestDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Canonical,
				title: "No watch mode",
				body: "Always run vitest with --run in agent terminals",
				scope: ["work"],
			});
			// And a draft memory in scope that must NOT be materialized.
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Draft,
				title: "Pending memory",
				body: "should not appear",
				scope: ["work"],
			});

			// And a claude-code project declaring the scope.
			const projectDir = await createTestProject("kb-memory-pull");
			try {
				const config = {
					version: "0.1.0",
					agent: "claude-code",
					categories: [],
					scope: ["work"],
				};
				await writeFile(join(projectDir, ".ai-rules.json"), JSON.stringify(config));

				// When the developer runs `pull`.
				const { result } = spawnCLI(["pull"], { cwd: projectDir, timeout: 30000 });
				const output = await result;
				expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);

				// Then the managed memory file is written.
				expect(await fileExists(projectDir, ".claude/rules/kb-memory.md")).toBe(true);
				const content = await readFile(join(projectDir, ".claude/rules/kb-memory.md"), "utf-8");

				// And it begins with the managed header and contains the canonical memory body.
				expect(content.startsWith(MANAGED_HEADER)).toBe(true);
				expect(content).toContain("Always run vitest with --run in agent terminals");
				// And the draft memory is NOT materialized.
				expect(content).not.toContain("should not appear");
			} finally {
				await cleanupTestProject(projectDir);
			}
		});

		it("overwrites the managed file idempotently on a second pull", async () => {
			// Given a canonical memory exists for scope "work".
			const db = await getTestDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Canonical,
				title: "Idempotent memory",
				body: "Materialization is idempotent",
				scope: ["work"],
			});

			const projectDir = await createTestProject("kb-memory-pull-idempotent");
			try {
				const config = { version: "0.1.0", agent: "claude-code", categories: [], scope: ["work"] };
				await writeFile(join(projectDir, ".ai-rules.json"), JSON.stringify(config));

				// When pull runs twice.
				expect((await spawnCLI(["pull"], { cwd: projectDir, timeout: 30000 }).result).exitCode).toBe(0);
				const firstContent = await readFile(join(projectDir, ".claude/rules/kb-memory.md"), "utf-8");
				expect((await spawnCLI(["pull"], { cwd: projectDir, timeout: 30000 }).result).exitCode).toBe(0);
				const secondContent = await readFile(join(projectDir, ".claude/rules/kb-memory.md"), "utf-8");

				// Then the file content is identical (idempotent overwrite, single managed header).
				expect(secondContent).toBe(firstContent);
				const headerOccurrences = secondContent.split(MANAGED_HEADER).length - 1;
				expect(headerOccurrences).toBe(1);
			} finally {
				await cleanupTestProject(projectDir);
			}
		});
	});

	describe("when the project agent is not claude-code", () => {
		it("does not write a kb-memory.md file", async () => {
			// Given a canonical memory exists for scope "work".
			const db = await getTestDatabase();
			await storeKbDocInTestDatabase(db, {
				type: KbType.Memory,
				status: KbStatus.Canonical,
				title: "Cursor skip",
				body: "memories are claude-code only for now",
				scope: ["work"],
			});

			// And a cursor project with a category to pull (so pull has work to do).
			const projectDir = await createTestProject("kb-memory-pull-cursor");
			try {
				const config = {
					version: "0.1.0",
					agent: "cursor",
					categories: [],
					scope: ["work"],
				};
				await writeFile(join(projectDir, ".ai-rules.json"), JSON.stringify(config));

				// When pull runs.
				const { result } = spawnCLI(["pull"], { cwd: projectDir, timeout: 30000 });
				await result;

				// Then no claude-code memory file is created for the non-claude-code agent.
				expect(await fileExists(projectDir, ".claude/rules/kb-memory.md")).toBe(false);
			} finally {
				await cleanupTestProject(projectDir);
			}
		});
	});
});
