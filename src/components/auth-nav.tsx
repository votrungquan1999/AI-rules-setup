"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLinkContent } from "src/components/nav-link";
import { cn } from "src/lib/utils";

interface NavItem {
	href: string;
	label: string;
}

const NAV_ITEMS: NavItem[] = [
	{ href: "/", label: "Home" },
	{ href: "/kb", label: "KB" },
	{ href: "/kb/review", label: "KB Review" },
	{ href: "/private-skills", label: "Private Skills" },
];

/**
 * Returns the href of the nav item that best matches `pathname` — the longest entry whose href
 * either exactly equals the pathname or is a proper path-segment prefix of it. Returns null when
 * nothing matches. Encoded as longest-prefix-wins so adding `/kb` next to `/kb/review` doesn't
 * leave both highlighted on the review page.
 * @param pathname - The current URL pathname
 * @returns The best-matching nav item's href, or null when nothing matches
 */
function pickActiveHref(pathname: string | null): string | null {
	if (!pathname) return null;
	let best: NavItem | null = null;
	for (const item of NAV_ITEMS) {
		const matches =
			item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
		if (!matches) continue;
		if (!best || item.href.length > best.href.length) best = item;
	}
	return best?.href ?? null;
}

/**
 * Top navigation bar shared across authenticated pages so reviewers can move between routes
 * without typing URLs. The active item is the longest-prefix match (see `pickActiveHref`) so
 * sibling routes like `/kb` and `/kb/review` don't both highlight at once.
 */
export function AuthNav() {
	const pathname = usePathname();
	const activeHref = pickActiveHref(pathname);
	return (
		<nav className="border-b border-border bg-card">
			<div className="mx-auto max-w-3xl flex flex-wrap items-center gap-1 px-8 py-3">
				{NAV_ITEMS.map((item) => {
					const isActive = item.href === activeHref;
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
								isActive
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							<NavLinkContent>{item.label}</NavLinkContent>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
