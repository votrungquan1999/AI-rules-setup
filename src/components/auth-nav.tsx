"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "src/lib/utils";

interface NavItem {
	href: string;
	label: string;
}

const NAV_ITEMS: NavItem[] = [
	{ href: "/", label: "Home" },
	{ href: "/kb/review", label: "KB Review" },
	{ href: "/private-skills", label: "Private Skills" },
];

/**
 * Top navigation bar shared across authenticated pages so reviewers can move between routes
 * without typing URLs. Highlights the active route based on `usePathname()`; the home item is
 * matched by exact equality, the rest by prefix so deeper routes (e.g. /kb/foo) stay highlighted
 * on their section.
 */
export function AuthNav() {
	const pathname = usePathname();
	return (
		<nav className="border-b border-border bg-card">
			<div className="mx-auto max-w-3xl flex flex-wrap items-center gap-1 px-8 py-3">
				{NAV_ITEMS.map((item) => {
					const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
							{item.label}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
