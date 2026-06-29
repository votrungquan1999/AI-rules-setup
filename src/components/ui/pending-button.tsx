"use client";

import { Loader2 } from "lucide-react";
import { Button } from "src/components/ui/button";

interface PendingButtonProps extends React.ComponentProps<typeof Button> {
	/** When true, the button shows a spinner, is disabled, and cannot re-fire its action. */
	pending?: boolean;
}

/**
 * Shared behavioral button that renders a pending state. While `pending`, it shows a spinner
 * alongside the caller's label, is disabled (so the action cannot re-fire), and sets `aria-busy`.
 * The label/content is always composed by the caller via `children`.
 *
 * `asChild` is gated while pending: Radix `Slot` requires a single child, but a pending button must
 * host both the spinner and the children, so during the pending window a real `Button` is rendered
 * regardless of `asChild`. When not pending, `asChild` behaves normally (passed through to Button).
 * @param props - Button props plus a `pending` flag
 */
export function PendingButton({ pending = false, asChild = false, disabled, children, ...props }: PendingButtonProps) {
	if (pending) {
		return (
			<Button {...props} asChild={false} disabled aria-busy>
				<Loader2 className="size-4 animate-spin" aria-hidden />
				{children}
			</Button>
		);
	}

	return (
		<Button {...props} asChild={asChild} disabled={disabled}>
			{children}
		</Button>
	);
}
