import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SESSION_COOKIE, verifySessionSecret } from "src/app/api/lib/session";
import { findAllCanonicalKbDocs } from "src/server/kb-repository";
import { KbPageClient } from "./KbPageClient";
import { KbBrowseProvider } from "./kb-browse.state";
import { KbListSkeleton } from "./kb-list.skeleton";
import { KbListLayout } from "./kb-list.ui";

/**
 * KB list page (server component). The static shell (`KbListLayout` → nav + container) renders
 * immediately, while the per-request content (session cookie + canonical docs) streams inside a
 * `<Suspense>` that shows `KbListSkeleton` until it resolves. Reading `cookies()` inside the
 * boundary satisfies Next's `cacheComponents` requirement while keeping the shell prerendered.
 */
export default function KbListPage() {
	return (
		<KbListLayout>
			<Suspense fallback={<KbListSkeleton />}>
				<KbListContent />
			</Suspense>
		</KbListLayout>
	);
}

/**
 * Dynamic content for the KB list. Verifies the session cookie (defense-in-depth behind the proxy
 * gate), fetches all canonical docs, and seeds the browse provider. `findAllCanonicalKbDocs()`
 * already returns the serializable `KbDoc` client shape, so it is passed straight through. The list
 * is unfiltered by scope — this is a reviewer/admin browse view, not the scope-gated agent endpoint.
 */
async function KbListContent() {
	const session = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!verifySessionSecret(session)) {
		redirect("/login");
	}

	const docs = await findAllCanonicalKbDocs();

	return (
		<KbBrowseProvider entries={docs}>
			<KbPageClient />
		</KbBrowseProvider>
	);
}
