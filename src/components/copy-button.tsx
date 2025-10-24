"use client";

import { Slot } from "@radix-ui/react-slot";
import { createContext, useContext, useState } from "react";

interface CopyButtonContextValue {
	/** Whether content is currently copied */
	isCopied: boolean;
	/** Whether copy operation is in progress */
	isCopying: boolean;
}

const CopyButtonContext = createContext<CopyButtonContextValue | null>(null);

/**
 * Hook to access copy button context
 */
function useCopyButtonContext() {
	const context = useContext(CopyButtonContext);
	if (!context) {
		throw new Error("useCopyButtonContext must be used within CopyButton");
	}
	return context;
}

interface CopyButtonProps {
	/** Value to copy to clipboard */
	value: string;
	/** Child elements to render (can use CopiedContent/DefaultContent) */
	children: React.ReactNode;
	/** If true, render child element using Slot */
	asChild?: boolean;
}

/**
 * Copy to clipboard button component using Radix Slot
 * Handles clipboard API with fallback for older browsers
 * Exposes copy state via context for child components
 */
export function CopyButton({ value, children, asChild = false }: CopyButtonProps) {
	const [isCopying, setIsCopying] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
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

			// Show success state
			setIsCopied(true);

			// Reset success state after 2 seconds
			setTimeout(() => {
				setIsCopied(false);
			}, 2000);
		} catch (error) {
			alert(`Failed to copy to clipboard: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsCopying(false);
		}
	};

	return (
		<CopyButtonContext.Provider value={{ isCopied, isCopying }}>
			<Comp onClick={handleCopy} disabled={isCopying || !value} type="button" data-copied={isCopied}>
				{children}
			</Comp>
		</CopyButtonContext.Provider>
	);
}

interface ConditionalContentProps {
	/** Child content to render conditionally */
	children: React.ReactNode;
}

/**
 * Only renders children when content has been copied
 */
export function CopiedContent({ children }: ConditionalContentProps) {
	const { isCopied } = useCopyButtonContext();
	return isCopied ? <>{children}</> : null;
}

/**
 * Only renders children when content has NOT been copied
 */
export function DefaultContent({ children }: ConditionalContentProps) {
	const { isCopied } = useCopyButtonContext();
	return isCopied ? null : <>{children}</>;
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
