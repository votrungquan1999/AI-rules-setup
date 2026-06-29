"use client";

import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";

interface NavLinkContentProps {
	/** The link label/content, composed by the caller and rendered inside a `<Link>`. */
	children: React.ReactNode;
}

/**
 * Renders a link's label plus a loading indicator while that link's destination is navigating.
 * Must be a descendant of a `<Link>` so `useLinkStatus()` reads that link's status; rendered outside
 * a `<Link>` it reads the idle default and shows nothing. Each instance reflects only its own link,
 * so clicking one link does not show indicators on siblings.
 * @param props - The link content as `children`
 */
export function NavLinkContent({ children }: NavLinkContentProps) {
	const { pending } = useLinkStatus();
	return (
		<>
			{children}
			{pending && <Loader2 className="size-3 animate-spin text-muted-foreground" aria-label="Loading" />}
		</>
	);
}
