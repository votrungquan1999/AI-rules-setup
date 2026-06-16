"use client";

import { cn } from "src/lib/utils";

/**
 * Page shell for the private-skills browse screen.
 * @param children - Header plus the skills list
 */
export function PrivateSkillsLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="min-h-screen bg-background">
			<div className="mx-auto max-w-3xl p-8 space-y-6">{children}</div>
		</main>
	);
}

/**
 * Header block for the browse screen.
 * @param children - Title and subtitle copy
 */
export function PrivateSkillsHeader({ children }: { children: React.ReactNode }) {
	return <div className="space-y-1">{children}</div>;
}

/**
 * Vertical list container for skill cards.
 * @param children - The skill cards
 */
export function PrivateSkillsList({ children }: { children: React.ReactNode }) {
	return <div className="space-y-4">{children}</div>;
}

/**
 * A single private-skill card.
 * @param children - The skill content
 */
export function PrivateSkillCard({ children }: { children: React.ReactNode }) {
	return <div className={cn("rounded-lg border border-border bg-card p-4", "space-y-2")}>{children}</div>;
}

/**
 * Row of scope tag chips.
 * @param children - The scope chips
 */
export function PrivateSkillScopes({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-wrap gap-2">{children}</div>;
}

/**
 * A single scope tag chip.
 * @param children - The scope label
 */
export function PrivateSkillScopeTag({ children }: { children: React.ReactNode }) {
	return <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{children}</span>;
}
