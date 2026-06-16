import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionSecret } from "src/app/api/lib/session";
import { findKbDrafts } from "src/server/kb-repository";
import { KbReviewPageClient } from "./KbReviewPageClient";
import { KbReviewProvider } from "./kb-review.state";
import type { KbDocDraft } from "./kb-review.type";

/**
 * KB review page (server component). Verifies the session cookie (defense-in-depth behind the
 * middleware gate), fetches the drafts awaiting review, converts them to the client `KbDocDraft`
 * shape, and seeds the review provider.
 */
export default async function KbReviewPage() {
	const session = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!verifySessionSecret(session)) {
		redirect("/login");
	}

	const drafts = await findKbDrafts();
	const clientDrafts: KbDocDraft[] = drafts.map((d) => ({
		id: d.id,
		type: d.type,
		title: d.title,
		body: d.body,
		scope: d.scope,
	}));

	return (
		<KbReviewProvider drafts={clientDrafts}>
			<KbReviewPageClient />
		</KbReviewProvider>
	);
}
