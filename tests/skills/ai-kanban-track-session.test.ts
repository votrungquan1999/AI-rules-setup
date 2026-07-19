import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKILL_DIR = join(process.cwd(), "skills", "claude-code", "ai-kanban-track-session");

/** Reads a file relative to the ai-kanban-track-session skill directory. */
async function read(rel: string): Promise<string> {
	return readFile(join(SKILL_DIR, rel), "utf8");
}

describe("ai-kanban-track-session skill", () => {
	it("defines a multi-file skill that drives self-tracking, including decision logging", async () => {
		const skill = await read("SKILL.md");

		// Frontmatter present with the supported fields (name/description/allowed-tools)
		expect(skill).toMatch(/^---\n/);
		expect(skill).toContain("name: ai-kanban-track-session");
		expect(skill).toContain("description:");
		expect(skill).toMatch(/allowed-tools:/);

		// allowed-tools covers the six dispatch tools + the shell (tolerate mcp__ prefix)
		for (const tool of [
			"create_card",
			"append_progress",
			"append_decision",
			"mark_decision_outdated",
			"set_status",
			"get_card_context",
		]) {
			expect(skill).toContain(tool);
		}
		expect(skill).toContain("Bash");

		// SKILL.md references each step file by relative path
		expect(skill).toContain("steps/1-open-card.md");
		expect(skill).toContain("steps/2-track-progress.md");
		expect(skill).toContain("steps/3-hand-off.md");

		// Step 2: decisions route to append_decision (with a why), not the progress-note misroute
		const trackProgress = await read("steps/2-track-progress.md");
		expect(trackProgress).toContain("append_decision");
		expect(trackProgress).toContain("mark_decision_outdated");
		expect(trackProgress.toLowerCase()).toContain("why");
		expect(trackProgress).not.toContain("a step finished, a decision made, a blocker hit");
	});
});
