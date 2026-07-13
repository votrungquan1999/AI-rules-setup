import { type NextRequest, NextResponse } from "next/server";
import { findAllPrivateSkills } from "../../../server/rules-repository";
import { verifySecret } from "../lib/verify-secret";

interface PrivateSkillListItem {
	id: string;
	name: string;
	agent: string;
	scopes: string[];
	description?: string;
}

/**
 * GET /api/skills
 *
 * Reviewer-only: lists all private skills across every scope as a client shape
 * (id/name/agent/scopes/description), via `findAllPrivateSkills`. Secret-gated (401).
 */
export async function GET(request: NextRequest) {
	if (!verifySecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const skills = await findAllPrivateSkills();
	const list: PrivateSkillListItem[] = skills
		.filter((s): s is typeof s & { id: string } => s.id !== undefined)
		.map((s) => {
			const item: PrivateSkillListItem = { id: s.id, name: s.name, agent: s.agent, scopes: s.scopes };
			if (s.description !== undefined) item.description = s.description;
			return item;
		});
	return NextResponse.json(list, { status: 200 });
}
