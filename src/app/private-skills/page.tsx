import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SESSION_COOKIE, verifySessionSecret } from "src/app/api/lib/session";
import { findAllPrivateSkills } from "src/server/rules-repository";
import { PrivateSkillsPageClient } from "./PrivateSkillsPageClient";
import { PrivateSkillsSkeleton } from "./private-skills.skeleton";
import { PrivateSkillsProvider } from "./private-skills-page.state";
import type { PrivateSkillDisplay } from "./private-skills-page.type";
import { PrivateSkillsLayout } from "./private-skills-page.ui";

/**
 * Private-skills browse page (server component). The static shell (`PrivateSkillsLayout` → nav +
 * container) renders immediately, while the per-request content (session cookie + live private-skill
 * data) streams inside a `<Suspense>` that shows `PrivateSkillsSkeleton` until it resolves. Reading
 * `cookies()` inside the boundary satisfies Next's `cacheComponents` requirement.
 */
export default function PrivateSkillsPage() {
	return (
		<PrivateSkillsLayout>
			<Suspense fallback={<PrivateSkillsSkeleton />}>
				<PrivateSkillsContent />
			</Suspense>
		</PrivateSkillsLayout>
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
	const display: PrivateSkillDisplay[] = skills
		.filter((s): s is typeof s & { id: string } => s.id !== undefined)
		.map((s) => {
			const item: PrivateSkillDisplay = {
				id: s.id,
				name: s.name,
				agent: s.agent,
				content: s.content,
				scopes: s.scopes,
			};
			if (s.description !== undefined) item.description = s.description;
			return item;
		});

	return (
		<PrivateSkillsProvider skills={display}>
			<PrivateSkillsPageClient />
		</PrivateSkillsProvider>
	);
}
