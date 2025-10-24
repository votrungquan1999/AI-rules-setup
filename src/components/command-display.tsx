"use client";

import { Copy } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useGeneratedCommand } from "src/lib/selection.state";
import { CopyButton } from "./copy-button";

/**
 * Command display with copy-to-clipboard functionality using shadcn Button
 * Uses selection context to get generated command
 */
export function CommandDisplay() {
	const command = useGeneratedCommand();

	if (!command) {
		return (
			<div>
				<h3 className="text-sm font-semibold text-foreground mb-3">Generated Command</h3>
				<p className="text-sm text-muted-foreground">Select rules to generate a command.</p>
			</div>
		);
	}

	return (
		<div>
			<h3 className="text-sm font-semibold text-foreground mb-3">Generated Command</h3>
			<div className="relative">
				<pre className="p-3 pr-12 bg-muted rounded text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all">
					{command}
				</pre>
				<CopyButton value={command} asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute top-2 right-2"
						aria-label="Copy command"
					>
						<Copy className="size-4" />
					</Button>
				</CopyButton>
			</div>
		</div>
	);
}
