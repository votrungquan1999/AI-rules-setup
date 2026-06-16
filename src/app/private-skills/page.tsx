import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionSecret } from "src/app/api/lib/session";
import { findAllPrivateSkills } from "src/server/rules-repository";
import { PrivateSkillsPageClient } from "./PrivateSkillsPageClient";
import { PrivateSkillsProvider } from "./private-skills-page.state";
import type { PrivateSkillDisplay } from "./private-skills-page.type";

/**
 * Private-skills browse page (server component). Verifies the session cookie (defense-in-depth
 * behind the middleware gate), fetches ALL private skills across every scope, converts them to the
 * client `PrivateSkillDisplay` shape, and seeds the browse provider.
 */
export default async function PrivateSkillsPage() {
	const session = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!verifySessionSecret(session)) {
		redirect("/login");
	}

	const skills = await findAllPrivateSkills();
	const display: PrivateSkillDisplay[] = skills.map((s) => {
		const item: PrivateSkillDisplay = { name: s.name, agent: s.agent, scopes: s.scopes };
		if (s.description !== undefined) item.description = s.description;
		return item;
	});

	return (
		<PrivateSkillsProvider skills={display}>
			<PrivateSkillsPageClient />
		</PrivateSkillsProvider>
	);
}
