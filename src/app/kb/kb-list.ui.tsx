"use client";

import { AuthNav } from "src/components/auth-nav";
import { cn } from "src/lib/utils";

/**
 * Page shell for the canonical KB browse screen — renders the shared authenticated-page nav at the
 * top and frames the heading + list region beneath it.
 * @param children - The page content (header + entry list)
 */
export function KbListLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="min-h-screen bg-background">
			<AuthNav />
			<div className="mx-auto max-w-3xl p-8 space-y-6">{children}</div>
		</main>
	);
}

/**
 * Header block for the KB list screen.
 * @param children - Title and subtitle copy
 */
export function KbListHeader({ children }: { children: React.ReactNode }) {
	return <div className="space-y-1">{children}</div>;
}

/**
 * Vertical list container for KB entry cards.
 * @param children - The entry cards
 */
export function KbListContainer({ children }: { children: React.ReactNode }) {
	return <div className="space-y-4">{children}</div>;
}

/**
 * A single canonical KB entry card — read-only display of title, body, scope, and metadata.
 * @param children - The entry content
 */
export function KbListCard({ children }: { children: React.ReactNode }) {
	return <div className={cn("rounded-lg border border-border bg-card p-4", "space-y-3")}>{children}</div>;
}

/**
 * Wrapping row that holds an entry's scope tags or its global badge.
 * @param children - Scope tags or the global badge
 */
export function KbListScopeRow({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-wrap gap-2">{children}</div>;
}

/**
 * A single scope tag chip shown on a scoped entry.
 * @param children - The scope name
 */
export function KbListScopeTag({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{children}</span>
	);
}

/** Badge marking an entry as global (no scope) — visually distinct from scope tags. */
export function KbListGlobalBadge() {
	return <span className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Global</span>;
}
