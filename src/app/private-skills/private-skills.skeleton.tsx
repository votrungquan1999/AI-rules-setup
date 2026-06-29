import { Skeleton } from "src/components/ui/skeleton";

const CARD_KEYS = ["a", "b", "c"];

/**
 * Loading placeholder for the private-skills content region, shown as the Suspense fallback while
 * the skills load. Mirrors `PrivateSkillsPageClient`'s content layout: a header (`space-y-1`) with
 * the filter button, over a `space-y-4` list of `space-y-2` cards that each have a two-column
 * name/agent row, a description line, `rounded-full` scope chips, and an Edit button. The page shell
 * (nav + container) prerenders around it.
 */
export function PrivateSkillsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<Skeleton className="h-8 w-40" />
				<Skeleton className="h-4 w-72" />
				<Skeleton className="h-9 w-36" />
			</div>
			<div className="space-y-4">
				{CARD_KEYS.map((key) => (
					<div key={key} className="rounded-lg border border-border bg-card p-4 space-y-2">
						<div className="flex items-center justify-between">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-20" />
						</div>
						<Skeleton className="h-4 w-full" />
						<div className="flex flex-wrap gap-2">
							<Skeleton className="h-5 w-12 rounded-full" />
							<Skeleton className="h-5 w-16 rounded-full" />
						</div>
						<Skeleton className="h-9 w-16" />
					</div>
				))}
			</div>
		</div>
	);
}
