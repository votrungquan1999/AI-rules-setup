"use client";

import { Slot } from "@radix-ui/react-slot";
import { useState } from "react";

interface CopyButtonProps {
	/** Value to copy to clipboard */
	value: string;
	/** Child element to trigger copy action */
	children: React.ReactNode;
	/** If true, render child element using Slot */
	asChild?: boolean;
}

/**
 * Copy to clipboard button component using Radix Slot
 * Handles clipboard API with fallback for older browsers
 */
export function CopyButton({ value, children, asChild = false }: CopyButtonProps) {
	const [isCopying, setIsCopying] = useState(false);
	const Comp = asChild ? Slot : "button";

	/**
	 * Handles copy to clipboard action
	 */
	const handleCopy = async () => {
		if (isCopying || !value) return;

		setIsCopying(true);

		try {
			// Try modern clipboard API first
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(value);
			} else {
				// Fallback for older browsers
				await fallbackCopy(value);
			}
		} catch (error) {
			alert(`Failed to copy to clipboard: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsCopying(false);
		}
	};

	return (
		<Comp onClick={handleCopy} disabled={isCopying || !value} type="button">
			{children}
		</Comp>
	);
}

/**
 * Fallback copy method for browsers without Clipboard API
 * @param text - Text to copy
 */
async function fallbackCopy(text: string): Promise<void> {
	const textArea = document.createElement("textarea");
	textArea.value = text;
	textArea.style.position = "fixed";
	textArea.style.left = "-999999px";
	textArea.style.top = "-999999px";
	document.body.appendChild(textArea);

	try {
		textArea.focus();
		textArea.select();

		const successful = document.execCommand("copy");
		if (!successful) {
			throw new Error("execCommand copy failed");
		}
	} finally {
		document.body.removeChild(textArea);
	}
}
