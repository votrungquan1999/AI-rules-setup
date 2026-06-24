"use client";

import { cn } from "src/lib/utils";

/**
 * Page shell for the review screen — heading area plus the list region.
 * @param children - The page content (header + draft list)
 */
export function KbReviewLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="min-h-screen bg-background">
			<div className="mx-auto max-w-3xl p-8 space-y-6">{children}</div>
		</main>
	);
}

/**
 * Header block for the review screen.
 * @param children - Title and subtitle copy
 */
export function KbReviewHeader({ children }: { children: React.ReactNode }) {
	return <div className="space-y-1">{children}</div>;
}

/**
 * Vertical list container for draft cards.
 * @param children - The draft cards
 */
export function KbReviewList({ children }: { children: React.ReactNode }) {
	return <div className="space-y-4">{children}</div>;
}

/**
 * A single draft card holding the draft content and its action buttons.
 * @param children - The draft content and actions
 */
export function KbReviewCard({ children }: { children: React.ReactNode }) {
	return <div className={cn("rounded-lg border border-border bg-card p-4", "space-y-3")}>{children}</div>;
}

/**
 * Horizontal action row inside a draft card.
 * @param children - The action buttons
 */
export function KbReviewActionsRow({ children }: { children: React.ReactNode }) {
	return <div className="flex gap-2">{children}</div>;
}

/**
 * Wrapping row that holds a draft's scope tags or its global badge.
 * @param children - Scope tags or the global badge
 */
export function KbScopeRow({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-wrap gap-2">{children}</div>;
}

/**
 * A single scope tag chip shown on a scoped draft.
 * @param children - The scope name
 */
export function KbScopeTag({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{children}</span>
	);
}

/** Badge marking a draft as global (no scope) — visually distinct from scope tags so reviewers can tell them apart. */
export function KbGlobalBadge() {
	return <span className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Global</span>;
}
