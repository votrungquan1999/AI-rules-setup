import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PRIVATE_SKILLS_COLLECTION_NAME, type StoredPrivateSkillDocument } from "../../src/server/types";
import { spawnCLI } from "../helpers/cli-utils";
import { getTestDatabase, seedTestDatabase, storePrivateSkillInTestDatabase } from "../helpers/seed-test-database";
import { cleanupTestProject, createTestProject, fileExists } from "../helpers/test-setup-utils";

interface RulesApiSkill {
	name: string;
	content: string;
	visibility?: "public" | "private";
	scopes?: string[];
}

interface RulesApiAgent {
	skills?: RulesApiSkill[];
}

interface RulesApiResponse {
	agents: Record<string, RulesApiAgent>;
}

describe("E2E: Private Skills", () => {
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

	async function createSkillDir(skillName: string, content: string): Promise<string> {
		const parent = await mkdtemp(join(tmpdir(), "private-skill-"));
		tempDirs.push(parent);
		const skillDir = join(parent, skillName);
		await mkdir(skillDir, { recursive: true });
		await writeFile(join(skillDir, "SKILL.md"), content);
		return skillDir;
	}

	describe("when uploading a private skill with the right credentials", () => {
		it("should accept the upload and persist the skill to private_skills_data", async () => {
			// Given a local skill directory with a SKILL.md file.
			const skillContent =
				"---\nname: secret-helper\ndescription: A private helper\n---\n\n# Secret Helper\n\nDo private things.";
			const skillDir = await createSkillDir("secret-helper", skillContent);

			// And the test process has the correct AI_RULES_SECRET set (injected by setup.ts).
			expect(process.env.AI_RULES_SECRET).toBe("test-secret");

			// When the developer runs `upload --agent claude-code --scope work <skillDir>`.
			const { result } = spawnCLI(["upload", "--agent", "claude-code", "--scope", "work", skillDir], {
				timeout: 30000,
			});
			const output = await result;

			// Then the CLI exits cleanly.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);

			// And the skill is persisted in MongoDB's private_skills_data collection.
			const db = await getTestDatabase();
			const stored = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ agent: "claude-code", name: "secret-helper" });
			expect(stored).not.toBeNull();
			expect(stored?.content).toBe(skillContent);
			expect(stored?.scopes).toEqual(["work"]);
		});
	});

	describe("when uploading a private skill with the wrong credentials", () => {
		it("should reject the request with 401 and persist nothing", async () => {
			// Given the API server is running with a known AI_RULES_SECRET.
			const apiUrl = process.env.AI_RULES_API_URL;
			if (!apiUrl) throw new Error("AI_RULES_API_URL not set by E2E setup");

			// When the client POSTs to /api/skills/upload with a wrong secret header.
			const response = await fetch(`${apiUrl}/api/skills/upload`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-ai-rules-secret": "wrong-secret",
				},
				body: JSON.stringify({
					agent: "claude-code",
					skill: { name: "intruder", content: "should not land" },
					scopes: ["work"],
				}),
			});

			// Then the server returns 401.
			expect(response.status).toBe(401);

			// And nothing was persisted to private_skills_data.
			const db = await getTestDatabase();
			const stored = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ agent: "claude-code", name: "intruder" });
			expect(stored).toBeNull();
		});
	});

	describe("when uploading without an explicit scope or --global", () => {
		it("should reject at the CLI with a non-zero exit and store nothing", async () => {
			// Given a valid skill directory but neither --scope nor --global.
			const skillDir = await createSkillDir("scopeless", "---\nname: scopeless\n---\n# x");

			// When the developer runs `upload --agent claude-code <skillDir>` without stating visibility.
			const { result } = spawnCLI(["upload", "--agent", "claude-code", skillDir], { timeout: 30000 });
			const output = await result;

			// Then the CLI refuses on the scope rule and persists nothing.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(1);
			expect(output.stderr).toContain("--scope");
			const db = await getTestDatabase();
			const stored = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ agent: "claude-code", name: "scopeless" });
			expect(stored).toBeNull();
		});

		it("should accept at the CLI and persist a global (empty-scope) skill when --global is passed", async () => {
			// Given a valid skill directory and an explicit --global opt-in.
			const skillDir = await createSkillDir("scopeless-global", "---\nname: scopeless-global\n---\n# x");

			// When the developer runs `upload --agent claude-code <skillDir> --global`.
			const { result } = spawnCLI(["upload", "--agent", "claude-code", skillDir, "--global"], { timeout: 30000 });
			const output = await result;

			// Then the CLI exits cleanly and the skill is stored as global.
			expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);
			const db = await getTestDatabase();
			const stored = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ agent: "claude-code", name: "scopeless-global" });
			expect(stored).not.toBeNull();
			expect(stored?.scopes).toEqual([]);
		});

		it("should accept at the API when scopes is an empty array and persist it as global", async () => {
			// Given the API server is running with the correct secret.
			const apiUrl = process.env.AI_RULES_API_URL;
			if (!apiUrl) throw new Error("AI_RULES_API_URL not set by E2E setup");

			// When the client POSTs an upload with `scopes: []`.
			const response = await fetch(`${apiUrl}/api/skills/upload`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-ai-rules-secret": "test-secret",
				},
				body: JSON.stringify({
					agent: "claude-code",
					skill: { name: "no-scope", content: "global skill" },
					scopes: [],
				}),
			});

			// Then the API accepts it and persists a global skill.
			expect(response.status).toBe(200);
			const db = await getTestDatabase();
			const stored = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ agent: "claude-code", name: "no-scope" });
			expect(stored?.scopes).toEqual([]);
		});
	});

	describe("when fetching with the right secret and a matching project scope", () => {
		it("should return the private skill alongside public ones, tagged with visibility=private", async () => {
			// Given a private skill exists for claude-code under scope "work".
			const db = await getTestDatabase();
			await storePrivateSkillInTestDatabase(
				db,
				"claude-code",
				{ name: "work-helper", content: "private work content" },
				["work"],
			);

			// And the API URL is set.
			const apiUrl = process.env.AI_RULES_API_URL;
			if (!apiUrl) throw new Error("AI_RULES_API_URL not set by E2E setup");

			// When the client fetches /api/rules with both secret and scope="work" headers.
			const response = await fetch(`${apiUrl}/api/rules`, {
				headers: {
					"x-ai-rules-secret": "test-secret",
					"x-ai-rules-scope": "work",
				},
			});

			// Then the response contains the private skill, tagged visibility=private.
			expect(response.ok).toBe(true);
			const payload = (await response.json()) as RulesApiResponse;
			const claudeCodeSkills = payload.agents["claude-code"]?.skills ?? [];
			const workHelper = claudeCodeSkills.find((s) => s.name === "work-helper");
			expect(workHelper).toBeDefined();
			expect(workHelper?.visibility).toBe("private");
			expect(workHelper?.scopes).toEqual(["work"]);
			// And the existing public skills are still present (the fixture seeds at least one).
			const publicSkills = claudeCodeSkills.filter((s) => s.visibility !== "private");
			expect(publicSkills.length).toBeGreaterThan(0);
		});
	});

	describe("when fetching with the right secret but a different project scope", () => {
		it("should not leak private skills that belong to other scopes — only public skills come back", async () => {
			// Given a private skill exists only under scope "work".
			const db = await getTestDatabase();
			await storePrivateSkillInTestDatabase(db, "claude-code", { name: "work-only", content: "work-only content" }, [
				"work",
			]);

			const apiUrl = process.env.AI_RULES_API_URL;
			if (!apiUrl) throw new Error("AI_RULES_API_URL not set by E2E setup");

			// When the client fetches with secret + scope="client-x" (no matching skill exists for this scope).
			const response = await fetch(`${apiUrl}/api/rules`, {
				headers: {
					"x-ai-rules-secret": "test-secret",
					"x-ai-rules-scope": "client-x",
				},
			});

			// Then the response is successful, the work-only skill is NOT in it, and public skills still are.
			expect(response.ok).toBe(true);
			const payload = (await response.json()) as RulesApiResponse;
			const claudeCodeSkills = payload.agents["claude-code"]?.skills ?? [];
			expect(claudeCodeSkills.find((s) => s.name === "work-only")).toBeUndefined();
			const publicSkills = claudeCodeSkills.filter((s) => s.visibility !== "private");
			expect(publicSkills.length).toBeGreaterThan(0);
		});
	});

	describe("when running pull in a project with a matching scope", () => {
		it("should install both public and private skills onto disk end-to-end", async () => {
			// Given a private skill exists under scope "work" for claude-code.
			const db = await getTestDatabase();
			await storePrivateSkillInTestDatabase(
				db,
				"claude-code",
				{ name: "work-helper", content: "---\nname: work-helper\n---\n# Work Helper" },
				["work"],
			);

			// And a project workspace exists with .ai-rules.json declaring the private skill + scope.
			const projectDir = await createTestProject("pull-private-skills");
			try {
				const config = {
					version: "0.1.0",
					agent: "claude-code",
					categories: [],
					skills: ["work-helper", "feature-dev-lite"],
					scope: ["work"],
				};
				await writeFile(join(projectDir, ".ai-rules.json"), JSON.stringify(config));

				// When the developer runs `pull` from inside that project.
				// The CLI subprocess inherits AI_RULES_SECRET=test-secret from setup.ts.
				const { result } = spawnCLI(["pull"], { cwd: projectDir, timeout: 30000 });
				const output = await result;
				expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);

				// Then both the private and the public skill files are installed.
				expect(await fileExists(projectDir, ".claude/skills/work-helper/SKILL.md")).toBe(true);
				expect(await fileExists(projectDir, ".claude/skills/feature-dev-lite/SKILL.md")).toBe(true);

				// And the private skill file actually contains the private content from MongoDB
				// (not a leftover or a public skill that happens to share the name).
				const installedPrivateContent = await readFile(
					join(projectDir, ".claude/skills/work-helper/SKILL.md"),
					"utf-8",
				);
				expect(installedPrivateContent).toBe("---\nname: work-helper\n---\n# Work Helper");
			} finally {
				await cleanupTestProject(projectDir);
			}
		});
	});

	describe("when uploading a newer version of the same private skill", () => {
		it("should overwrite the previous content and update the timestamp", async () => {
			// Given a private skill is uploaded with the original content.
			const firstSkillDir = await createSkillDir("upsert-target", "first version");
			const first = spawnCLI(["upload", "--agent", "claude-code", "--scope", "work", firstSkillDir], {
				timeout: 30000,
			});
			expect((await first.result).exitCode).toBe(0);

			const db = await getTestDatabase();
			const beforeDoc = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ agent: "claude-code", name: "upsert-target" });
			if (!beforeDoc) throw new Error("expected first upload to persist a document");
			expect(beforeDoc.content).toBe("first version");
			const originalCreatedAt = beforeDoc.createdAt;

			// When a second upload runs with the same agent + skill name but new content + new scopes.
			const secondSkillDir = await createSkillDir("upsert-target", "second version");
			const second = spawnCLI(["upload", "--agent", "claude-code", "--scope", "work,client-x", secondSkillDir], {
				timeout: 30000,
			});
			expect((await second.result).exitCode).toBe(0);

			// Then the document is replaced in place — only one doc remains, with the new content, new scopes,
			// preserved createdAt, and the updatedAt has advanced.
			const docs = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.find({ agent: "claude-code", name: "upsert-target" })
				.toArray();
			expect(docs.length).toBe(1);
			const afterDoc = docs[0];
			if (!afterDoc) throw new Error("expected one document after upsert");
			expect(afterDoc.content).toBe("second version");
			expect(afterDoc.scopes).toEqual(["work", "client-x"]);
			expect(afterDoc.createdAt.getTime()).toBe(originalCreatedAt.getTime());
			// Two separate CLI subprocess invocations take hundreds of ms apart, so updatedAt
			// must have strictly advanced past the preserved createdAt — proves it was rewritten,
			// not just copied from $setOnInsert.
			expect(afterDoc.updatedAt.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
		});
	});

	describe("when a private skill is tagged with multiple scopes", () => {
		it("should be visible from any of those scopes", async () => {
			// Given a private skill tagged ["work", "client-x"].
			const db = await getTestDatabase();
			await storePrivateSkillInTestDatabase(
				db,
				"claude-code",
				{ name: "multi-scope-helper", content: "shared across scopes" },
				["work", "client-x"],
			);

			const apiUrl = process.env.AI_RULES_API_URL;
			if (!apiUrl) throw new Error("AI_RULES_API_URL not set by E2E setup");

			// When fetched from a project scoped to "work".
			const fromWork = await fetch(`${apiUrl}/api/rules`, {
				headers: { "x-ai-rules-secret": "test-secret", "x-ai-rules-scope": "work" },
			});
			const fromWorkPayload = (await fromWork.json()) as RulesApiResponse;
			const workSkill = (fromWorkPayload.agents["claude-code"]?.skills ?? []).find(
				(s) => s.name === "multi-scope-helper",
			);
			expect(workSkill).toBeDefined();

			// And when fetched from a project scoped to "client-x".
			const fromClient = await fetch(`${apiUrl}/api/rules`, {
				headers: { "x-ai-rules-secret": "test-secret", "x-ai-rules-scope": "client-x" },
			});
			const fromClientPayload = (await fromClient.json()) as RulesApiResponse;
			const clientSkill = (fromClientPayload.agents["claude-code"]?.skills ?? []).find(
				(s) => s.name === "multi-scope-helper",
			);
			expect(clientSkill).toBeDefined();

			// Then both responses return the same skill content.
			expect(workSkill?.content).toBe("shared across scopes");
			expect(clientSkill?.content).toBe("shared across scopes");
		});
	});

	describe("when a workspace belongs to several scopes", () => {
		it("should receive every private skill tagged to any of those scopes, and nothing tagged only to an unrelated scope", async () => {
			// Given three single-scope private skills: two in the workspace's scopes, one outside.
			const db = await getTestDatabase();
			await storePrivateSkillInTestDatabase(db, "claude-code", { name: "work-scoped", content: "belongs to work" }, [
				"work",
			]);
			await storePrivateSkillInTestDatabase(
				db,
				"claude-code",
				{ name: "client-scoped", content: "belongs to client-x" },
				["client-x"],
			);
			await storePrivateSkillInTestDatabase(
				db,
				"claude-code",
				{ name: "unrelated-scoped", content: "belongs to other" },
				["other"],
			);

			const apiUrl = process.env.AI_RULES_API_URL;
			if (!apiUrl) throw new Error("AI_RULES_API_URL not set by E2E setup");

			// When fetched from a multi-scope workspace (CSV-encoded "work,client-x" header).
			const response = await fetch(`${apiUrl}/api/rules`, {
				headers: {
					"x-ai-rules-secret": "test-secret",
					"x-ai-rules-scope": "work,client-x",
				},
			});

			// Then both in-scope skills come back...
			expect(response.ok).toBe(true);
			const payload = (await response.json()) as RulesApiResponse;
			const claudeCodeSkills = payload.agents["claude-code"]?.skills ?? [];
			const workScoped = claudeCodeSkills.find((s) => s.name === "work-scoped");
			const clientScoped = claudeCodeSkills.find((s) => s.name === "client-scoped");
			expect(workScoped?.content).toBe("belongs to work");
			expect(clientScoped?.content).toBe("belongs to client-x");

			// ...and the skill tagged only to an unrelated scope is NOT delivered.
			expect(claudeCodeSkills.find((s) => s.name === "unrelated-scoped")).toBeUndefined();
		});
	});

	describe("when running `add --skills` in a project with a matching scope", () => {
		it("should install the private skill into the workspace", async () => {
			// Given a private skill exists for claude-code under scope "work".
			const db = await getTestDatabase();
			await storePrivateSkillInTestDatabase(
				db,
				"claude-code",
				{ name: "add-target-helper", content: "---\nname: add-target-helper\n---\n# Add Target" },
				["work"],
			);

			// And a project workspace exists with .ai-rules.json declaring agent + scope (no skills yet).
			const projectDir = await createTestProject("add-private-skill");
			try {
				const config = {
					version: "0.1.0",
					agent: "claude-code",
					categories: [],
					skills: [],
					scope: ["work"],
				};
				await writeFile(join(projectDir, ".ai-rules.json"), JSON.stringify(config));

				// When the developer runs `add --skills add-target-helper --overwrite-strategy force`.
				const { result } = spawnCLI(["add", "--skills", "add-target-helper", "--overwrite-strategy", "force"], {
					cwd: projectDir,
					timeout: 30000,
				});
				const output = await result;
				expect(output.exitCode, `stdout: ${output.stdout}\nstderr: ${output.stderr}`).toBe(0);

				// Then the private skill is installed on disk with its actual content.
				expect(await fileExists(projectDir, ".claude/skills/add-target-helper/SKILL.md")).toBe(true);
				const installed = await readFile(join(projectDir, ".claude/skills/add-target-helper/SKILL.md"), "utf-8");
				expect(installed).toBe("---\nname: add-target-helper\n---\n# Add Target");
			} finally {
				await cleanupTestProject(projectDir);
			}
		});
	});

	describe("when the secret is valid but no project scope is configured", () => {
		it("should receive global private skills but never scoped ones", async () => {
			// Given a scoped private skill and a global (empty-scope) private skill.
			const db = await getTestDatabase();
			await storePrivateSkillInTestDatabase(db, "claude-code", { name: "no-scope-leak", content: "should not leak" }, [
				"work",
			]);
			await storePrivateSkillInTestDatabase(
				db,
				"claude-code",
				{ name: "global-helper", content: "everyone gets me" },
				[],
			);

			const apiUrl = process.env.AI_RULES_API_URL;
			if (!apiUrl) throw new Error("AI_RULES_API_URL not set by E2E setup");

			// When the client sends only the correct secret (no scope header).
			const response = await fetch(`${apiUrl}/api/rules`, {
				headers: { "x-ai-rules-secret": "test-secret" },
			});

			// Then the global skill surfaces as private; the scoped skill stays hidden.
			expect(response.ok).toBe(true);
			const payload = (await response.json()) as RulesApiResponse;
			const allSkills = Object.values(payload.agents).flatMap((a) => a.skills ?? []);
			expect(allSkills.find((s) => s.name === "no-scope-leak")).toBeUndefined();
			const global = allSkills.find((s) => s.name === "global-helper");
			expect(global?.visibility).toBe("private");
		});
	});

	describe("when the secret header is wrong", () => {
		it("should return public skills only — silently, with no hint that private skills exist", async () => {
			// Given a private skill exists under scope "work".
			const db = await getTestDatabase();
			await storePrivateSkillInTestDatabase(db, "claude-code", { name: "silent-leak", content: "should not leak" }, [
				"work",
			]);

			const apiUrl = process.env.AI_RULES_API_URL;
			if (!apiUrl) throw new Error("AI_RULES_API_URL not set by E2E setup");

			// When the client sends a wrong secret AND the matching scope.
			const response = await fetch(`${apiUrl}/api/rules`, {
				headers: {
					"x-ai-rules-secret": "wrong-secret",
					"x-ai-rules-scope": "work",
				},
			});

			// Then the response is 200 (no auth error leaked) and the private skill is not in the payload.
			expect(response.status).toBe(200);
			const payload = (await response.json()) as RulesApiResponse;
			const allSkills = Object.values(payload.agents).flatMap((a) => a.skills ?? []);
			expect(allSkills.find((s) => s.name === "silent-leak")).toBeUndefined();
			expect(allSkills.find((s) => s.visibility === "private")).toBeUndefined();
			// Positive control: public skills are still there.
			expect(allSkills.length).toBeGreaterThan(0);
		});
	});

	describe("when no AI_RULES_SECRET header is sent", () => {
		it("should return public skills only — never a skill marked visibility:private", async () => {
			// Given the API has been seeded with the public test fixtures (no private skills exist yet).
			const apiUrl = process.env.AI_RULES_API_URL;
			if (!apiUrl) throw new Error("AI_RULES_API_URL not set by E2E setup");

			// When the client fetches /api/rules without any auth headers.
			const response = await fetch(`${apiUrl}/api/rules`);

			// Then the response is successful, contains skills, and none of them are private.
			expect(response.ok).toBe(true);
			const payload = (await response.json()) as RulesApiResponse;
			const allSkills = Object.values(payload.agents).flatMap((agent) => agent.skills ?? []);
			expect(allSkills.length).toBeGreaterThan(0);
			const privateLeak = allSkills.find((skill) => skill.visibility === "private");
			expect(privateLeak).toBeUndefined();
		});
	});

	describe("PATCH /api/skills/[id]", () => {
		function apiUrl(): string {
			const url = process.env.AI_RULES_API_URL;
			if (!url) throw new Error("AI_RULES_API_URL not set by E2E setup");
			return url;
		}

		/**
		 * Uploads a private skill through the public upload route (which assigns a permanent id), then
		 * reads the stored document back so a test can address it by that id.
		 * @param name - The skill name to upload
		 * @returns The stored document, guaranteed to carry an id
		 */
		async function uploadAndReadStored(name: string): Promise<StoredPrivateSkillDocument & { id: string }> {
			const response = await fetch(`${apiUrl()}/api/skills/upload`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "x-ai-rules-secret": "test-secret" },
				body: JSON.stringify({
					agent: "claude-code",
					skill: { name, content: "original content", description: "original desc" },
					scopes: ["work"],
				}),
			});
			expect(response.status).toBe(200);
			const db = await getTestDatabase();
			const stored = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ agent: "claude-code", name });
			if (!stored?.id) throw new Error("expected uploaded skill to have a permanent id");
			return stored as StoredPrivateSkillDocument & { id: string };
		}

		it("rejects a request without the secret with 401 and persists nothing", async () => {
			const stored = await uploadAndReadStored("patch-no-secret");
			const response = await fetch(`${apiUrl()}/api/skills/${stored.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "hacked", content: "x", scopes: [] }),
			});
			expect(response.status).toBe(401);

			// And the skill is unchanged.
			const db = await getTestDatabase();
			const after = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ id: stored.id });
			expect(after?.name).toBe("patch-no-secret");
		});

		it("returns 400 when name or content is missing", async () => {
			const stored = await uploadAndReadStored("patch-bad-body");
			const response = await fetch(`${apiUrl()}/api/skills/${stored.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json", "x-ai-rules-secret": "test-secret" },
				body: JSON.stringify({ scopes: [] }),
			});
			expect(response.status).toBe(400);
		});

		it("returns 404 when no skill has that id", async () => {
			const response = await fetch(`${apiUrl()}/api/skills/no-such-id`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json", "x-ai-rules-secret": "test-secret" },
				body: JSON.stringify({ name: "x", content: "y", scopes: [] }),
			});
			expect(response.status).toBe(404);
		});

		it("persists an edited name, content, description, and scopes by id", async () => {
			const stored = await uploadAndReadStored("patch-full");
			const response = await fetch(`${apiUrl()}/api/skills/${stored.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json", "x-ai-rules-secret": "test-secret" },
				body: JSON.stringify({
					name: "patch-full-renamed",
					content: "new content",
					description: "new desc",
					scopes: ["client-x", "team"],
				}),
			});
			expect(response.status).toBe(200);

			const db = await getTestDatabase();
			const after = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ id: stored.id });
			expect(after?.name).toBe("patch-full-renamed");
			expect(after?.content).toBe("new content");
			expect(after?.description).toBe("new desc");
			expect(after?.scopes).toEqual(["client-x", "team"]);
			// The owning agent is left intact.
			expect(after?.agent).toBe("claude-code");
		});

		it("clears the description when the PATCH omits it", async () => {
			const stored = await uploadAndReadStored("patch-clear-desc");
			expect(stored.description).toBe("original desc");

			const response = await fetch(`${apiUrl()}/api/skills/${stored.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json", "x-ai-rules-secret": "test-secret" },
				body: JSON.stringify({ name: "patch-clear-desc", content: "original content", scopes: ["work"] }),
			});
			expect(response.status).toBe(200);

			const db = await getTestDatabase();
			const after = await db
				.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME)
				.findOne({ id: stored.id });
			expect(after?.description).toBeUndefined();
		});
	});
});
