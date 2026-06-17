import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SESSION_COOKIE, verifySessionSecret } from "src/app/api/lib/session";
import { findKbDrafts } from "src/server/kb-repository";
import { KbReviewPageClient } from "./KbReviewPageClient";
import { KbReviewProvider } from "./kb-review.state";
import type { KbDocDraft } from "./kb-review.type";

/**
 * KB review page (server component). The per-request content (session cookie + live draft data) is
 * rendered inside a `<Suspense>` boundary, which is how Next's `cacheComponents` requires uncached
 * dynamic data to be accessed (route-segment `dynamic = "force-dynamic"` is incompatible with it).
 */
export default function KbReviewPage() {
	return (
		<Suspense fallback={null}>
			<KbReviewContent />
		</Suspense>
	);
}

/**
 * Dynamic content for the review page. Verifies the session cookie (defense-in-depth behind the
 * proxy gate), fetches the drafts awaiting review, converts them to the client `KbDocDraft` shape,
 * and seeds the review provider.
 */
async function KbReviewContent() {
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
