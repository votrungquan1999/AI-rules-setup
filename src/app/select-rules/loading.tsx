import { Skeleton } from "src/components/ui/skeleton";

const CARD_KEYS = ["a", "b", "c", "d"];

/**
 * Route loading UI for `/select-rules`, shown while the page's rules data is fetched. The page's
 * default export is async (cached via `"use cache"`), so this segment-level loader fires on cold
 * navigation. Mirrors the page shell (`min-h-screen bg-background`, `max-w-7xl mx-auto p-8`, the
 * `text-4xl` header) with a placeholder grid of agent-landing cards (`border-2 rounded-xl`, matching
 * `AgentLanding`'s `grid grid-cols-1 md:grid-cols-3 gap-6`). Exported as `SelectRulesSkeleton` too
 * so it can double as an in-page Suspense fallback if needed.
 */
export function SelectRulesSkeleton() {
	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto p-8">
				<div className="mb-8 space-y-2">
					<Skeleton className="h-10 w-72" />
					<Skeleton className="h-6 w-96 max-w-full" />
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{CARD_KEYS.map((key) => (
						<div key={key} className="border-2 border-border rounded-xl bg-card p-6 space-y-3">
							<Skeleton className="h-6 w-32" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/** Default export consumed by Next.js as the route's loading UI. */
export default function Loading() {
	return <SelectRulesSkeleton />;
}
