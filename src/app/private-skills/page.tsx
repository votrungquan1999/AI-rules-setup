import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SESSION_COOKIE, verifySessionSecret } from "src/app/api/lib/session";
import { findAllPrivateSkills } from "src/server/rules-repository";
import { PrivateSkillsPageClient } from "./PrivateSkillsPageClient";
import { PrivateSkillsProvider } from "./private-skills-page.state";
import type { PrivateSkillDisplay } from "./private-skills-page.type";

/**
 * Private-skills browse page (server component). The per-request content (session cookie + live
 * private-skill data) is rendered inside a `<Suspense>` boundary, which is how Next's
 * `cacheComponents` requires uncached dynamic data to be accessed.
 */
export default function PrivateSkillsPage() {
	return (
		<Suspense fallback={null}>
			<PrivateSkillsContent />
		</Suspense>
	);
}

/**
 * Dynamic content for the private-skills page. Verifies the session cookie (defense-in-depth behind
 * the proxy gate), fetches ALL private skills across every scope, converts them to the client
 * `PrivateSkillDisplay` shape, and seeds the browse provider.
 */
async function PrivateSkillsContent() {
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
