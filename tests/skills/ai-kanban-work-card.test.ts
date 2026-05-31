import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKILL_DIR = join(process.cwd(), "skills", "claude-code", "ai-kanban-work-card");

/** Reads a file relative to the ai-kanban-work-card skill directory. */
async function read(rel: string): Promise<string> {
	return readFile(join(SKILL_DIR, rel), "utf8");
}

describe("ai-kanban-work-card skill", () => {
	it("defines a multi-file skill that drives the dispatch flow", async () => {
		const skill = await read("SKILL.md");

		// Frontmatter present with the supported fields (name/description/allowed-tools)
		expect(skill).toMatch(/^---\n/);
		expect(skill).toContain("name: ai-kanban-work-card");
		expect(skill).toContain("description:");
		expect(skill).toMatch(/allowed-tools:/);

		// allowed-tools covers the four dispatch tools + the shell (tolerate mcp__ prefix)
		for (const tool of ["claim_card", "get_card_context", "set_status", "set_workspace"]) {
			expect(skill).toContain(tool);
		}
		expect(skill).toContain("Bash");

		// The card id is documented via a prose <id> placeholder + usage line,
		// NOT a frontmatter argument key (the repo's convention)
		expect(skill).toContain("<id>");
		expect(skill).toContain("/ai-kanban-work-card <id>");

		// SKILL.md references each step file by relative path
		expect(skill).toContain("steps/1-claim.md");
		expect(skill).toContain("steps/2-prepare-worktrees.md");
		expect(skill).toContain("steps/3-work-and-complete.md");

		// Step 1: claim, then stop-and-report if nothing came back
		const claim = await read("steps/1-claim.md");
		expect(claim).toContain("claim_card");
		expect(claim.toLowerCase()).toContain("stop");

		// Step 2: worktree conventions + recovery + FULL-set workspace declaration
		const worktrees = await read("steps/2-prepare-worktrees.md");
		expect(worktrees).toContain("aikanban/card-");
		expect(worktrees).toContain("workspaces/card-");
		expect(worktrees).toContain("set_workspace");
		expect(worktrees.toLowerCase()).toContain("full");
		expect(worktrees.toLowerCase()).toContain("already exists");

		// Step 3: read context, complete to need_review, park
		const work = await read("steps/3-work-and-complete.md");
		expect(work).toContain("get_card_context");
		expect(work).toContain("set_status");
		expect(work).toContain("need_review");
		expect(work.toLowerCase()).toContain("park");
	});
});
