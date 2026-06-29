import { Skeleton } from "src/components/ui/skeleton";

const CARD_KEYS = ["a", "b", "c"];

/**
 * Loading placeholder for the KB list content region (header + entry cards), shown as the Suspense
 * fallback while canonical docs load. Mirrors `KbPageClient`'s content layout (header `space-y-1`
 * over a `space-y-4` list of `rounded-lg border bg-card p-4 space-y-3` cards, each ending with a
 * `flex gap-2` Edit button row) so the shell stays stable when the real content swaps in. The page
 * shell (nav + container) prerenders around it.
 */
export function KbListSkeleton() {
	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>
			<div className="space-y-4">
				{CARD_KEYS.map((key) => (
					<div key={key} className="rounded-lg border border-border bg-card p-4 space-y-3">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<div className="flex flex-wrap gap-2">
							<Skeleton className="h-5 w-12 rounded" />
							<Skeleton className="h-5 w-16 rounded" />
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-9 w-16" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
