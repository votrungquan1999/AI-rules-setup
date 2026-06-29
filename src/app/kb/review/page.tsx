import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SESSION_COOKIE, verifySessionSecret } from "src/app/api/lib/session";
import { findKbDrafts } from "src/server/kb-repository";
import { KbReviewPageClient } from "./KbReviewPageClient";
import { KbReviewSkeleton } from "./kb-review.skeleton";
import { KbReviewProvider } from "./kb-review.state";
import type { KbDocDraft } from "./kb-review.type";
import { KbReviewLayout } from "./kb-review.ui";

/**
 * KB review page (server component). The static shell (`KbReviewLayout` → nav + container) renders
 * immediately, while the per-request content (session cookie + live draft data) streams inside a
 * `<Suspense>` that shows `KbReviewSkeleton` until it resolves. Reading `cookies()` inside the
 * boundary satisfies Next's `cacheComponents` requirement while keeping the shell prerendered.
 */
export default function KbReviewPage() {
	return (
		<KbReviewLayout>
			<Suspense fallback={<KbReviewSkeleton />}>
				<KbReviewContent />
			</Suspense>
		</KbReviewLayout>
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
