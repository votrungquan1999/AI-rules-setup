import { Skeleton } from "src/components/ui/skeleton";

const CARD_KEYS = ["a", "b", "c"];

/**
 * Loading placeholder for the KB review content region, shown as the Suspense fallback while drafts
 * load. Mirrors `KbReviewPageClient`'s content layout: a header (`space-y-1`) with the filter +
 * approve-all button row, over a `space-y-4` list of draft cards that each carry a three-button
 * action row (`flex gap-2`). The page shell (nav + container) prerenders around it.
 */
export function KbReviewSkeleton() {
	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-80" />
				<div className="flex flex-wrap gap-2 pt-1">
					<Skeleton className="h-9 w-32" />
					<Skeleton className="h-9 w-36" />
				</div>
			</div>
			<div className="space-y-4">
				{CARD_KEYS.map((key) => (
					<div key={key} className="rounded-lg border border-border bg-card p-4 space-y-3">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-4 w-full" />
						<div className="flex flex-wrap gap-2">
							<Skeleton className="h-5 w-12 rounded" />
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-9 w-20" />
							<Skeleton className="h-9 w-16" />
							<Skeleton className="h-9 w-20" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
