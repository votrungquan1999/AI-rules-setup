"use client";

import { Check, Copy } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useSkills, useWorkflows } from "src/lib/manifests.state";
import { generateChatGptPrompt } from "src/lib/prompt-generator";
import { useSelectedAgent } from "src/lib/selection.state";
import type { Manifest } from "src/server/types";
import { CopiedContent, CopyButton, DefaultContent } from "./copy-button";

interface PromptDisplayProps {
	/** All available manifests */
	manifests: Manifest[];
}

/**
 * Prompt display with copy-to-clipboard functionality using shadcn Button
 * Generates ChatGPT prompt from all available manifests, skills, and workflows
 */
export function PromptDisplay({ manifests }: PromptDisplayProps) {
	const agent = useSelectedAgent();
	const skills = useSkills();
	const workflows = useWorkflows();
	const prompt = generateChatGptPrompt(manifests, agent, skills, workflows);

	return (
		<div>
			<h3 className="text-sm font-semibold text-foreground mb-3">ChatGPT Prompt</h3>
			<div className="relative">
				<pre className="p-3 pr-12 bg-muted rounded text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
					{prompt}
				</pre>
				<CopyButton value={prompt} asChild>
					<Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" aria-label="Copy prompt">
						<CopiedContent>
							<Check className="size-4 text-green-600" />
						</CopiedContent>
						<DefaultContent>
							<Copy className="size-4" />
						</DefaultContent>
					</Button>
				</CopyButton>
			</div>
			<p className="text-xs text-muted-foreground mt-2">
				Copy this prompt and paste it into ChatGPT to get help selecting the right rules for your project.
			</p>
		</div>
	);
}
