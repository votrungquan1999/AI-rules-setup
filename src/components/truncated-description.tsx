"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface TruncatedDescriptionProps {
	/** Description text to display */
	text: string;
}

/**
 * Description component that truncates long text with expand/collapse functionality
 * Shows 2 lines with ellipsis by default, with "Show more/less" button if text overflows
 */
export function TruncatedDescription({ text }: TruncatedDescriptionProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isTruncated, setIsTruncated] = useState(false);
	const textRef = useRef<HTMLParagraphElement>(null);

	/**
	 * Check if text is actually truncated by comparing scrollHeight with clientHeight
	 * Uses useLayoutEffect to measure synchronously before browser paint
	 */
	useLayoutEffect(() => {
		const element = textRef.current;
		if (!element) return;

		// Check if content is truncated
		const checkTruncation = () => {
			setIsTruncated(element.scrollHeight > element.clientHeight);
		};

		// Measure immediately - no setTimeout needed with useLayoutEffect
		checkTruncation();

		// Recheck on window resize
		window.addEventListener("resize", checkTruncation);
		return () => {
			window.removeEventListener("resize", checkTruncation);
		};
	}, [text]);

	if (isExpanded) {
		return (
			<div className="space-y-1">
				<p className="text-sm text-muted-foreground">{text}</p>
				<button
					type="button"
					onClick={() => setIsExpanded(false)}
					className="text-xs text-primary hover:underline"
				>
					Show less
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-start gap-1">
			<p ref={textRef} className="text-sm text-muted-foreground line-clamp-1 flex-1 min-w-0">
				{text}
			</p>
			{isTruncated && (
				<button
					type="button"
					onClick={() => setIsExpanded(true)}
					className="text-xs text-primary hover:underline whitespace-nowrap shrink-0"
				>
					Show more
				</button>
			)}
		</div>
	);
}

