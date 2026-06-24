import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SESSION_COOKIE, verifySessionSecret } from "src/app/api/lib/session";
import { findAllCanonicalKbDocs } from "src/server/kb-repository";
import type { KbDoc } from "src/server/types";
import {
	KbListCard,
	KbListContainer,
	KbListGlobalBadge,
	KbListHeader,
	KbListLayout,
	KbListScopeRow,
	KbListScopeTag,
} from "./kb-list.ui";

/**
 * KB list page (server component). The per-request content (session cookie + canonical docs) is
 * rendered inside a `<Suspense>` boundary, matching `/kb/review`'s structure for Next's
 * `cacheComponents` compatibility.
 */
export default function KbListPage() {
	return (
		<Suspense fallback={null}>
			<KbListContent />
		</Suspense>
	);
}

/**
 * Renders one entry card. Defined alongside the page (not in the ui file) because it composes
 * server-rendered content from the `KbDoc` shape — display components stay pure children-takers.
 * @param doc - The canonical KB document to render
 */
function KbListEntry({ doc }: { doc: KbDoc }) {
	return (
		<KbListCard>
			<div className="space-y-1">
				<span className="text-xs font-medium uppercase text-muted-foreground">{doc.type}</span>
				<h2 className="font-semibold text-foreground">{doc.title}</h2>
				<p className="whitespace-pre-wrap text-sm text-muted-foreground">{doc.body}</p>
				<KbListScopeRow>
					{doc.scope.length === 0 ? (
						<KbListGlobalBadge />
					) : (
						doc.scope.map((s) => <KbListScopeTag key={s}>{s}</KbListScopeTag>)
					)}
				</KbListScopeRow>
			</div>
		</KbListCard>
	);
}

/**
 * Dynamic content for the KB list. Verifies the session cookie (defense-in-depth behind the proxy
 * gate), fetches all canonical docs, and renders them. The list is unfiltered by scope — this is a
 * reviewer/admin browse view, not the scope-gated agent search endpoint.
 */
async function KbListContent() {
	const session = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!verifySessionSecret(session)) {
		redirect("/login");
	}

	const docs = await findAllCanonicalKbDocs();

	return (
		<KbListLayout>
			<KbListHeader>
				<h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
				<p className="text-muted-foreground">
					Approved canonical entries returned to agents. {docs.length} {docs.length === 1 ? "entry" : "entries"}.
				</p>
			</KbListHeader>

			{docs.length === 0 ? (
				<p className="text-muted-foreground">No canonical entries yet.</p>
			) : (
				<KbListContainer>
					{docs.map((doc) => (
						<KbListEntry key={doc.id} doc={doc} />
					))}
				</KbListContainer>
			)}
		</KbListLayout>
	);
}
