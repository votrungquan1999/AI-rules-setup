"use client";

import { Check, Copy } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useSkills, useWorkflows } from "src/lib/manifests.state";
import { generateChatGptPrompt } from "src/lib/prompt-generator";
import { useSelectedAgent } from "src/lib/selection.state";
import type { Manifest } from "src/server/types";
import { CopiedContent, CopyButton, DefaultContent } from "./copy-button";

interface GettingStartedBannerProps {
	manifests: Manifest[];
}

/**
 * Getting Started banner at the top of the content view.
 * Contains a CTA and a copy-to-clipboard button for the ChatGPT prompt.
 */
export function GettingStartedBanner({ manifests }: GettingStartedBannerProps) {
	const agent = useSelectedAgent();
	const skills = useSkills();
	const workflows = useWorkflows();
	const prompt = generateChatGptPrompt(manifests, agent, skills, workflows);

	return (
		<div data-testid="getting-started-banner" className="p-4 mb-4 rounded-lg border border-border bg-accent/30">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					💡 <strong>Not sure what to pick?</strong> Use a preset above, or copy this prompt into ChatGPT
				</p>
				<CopyButton value={prompt} asChild>
					<Button type="button" variant="outline" size="sm" aria-label="Copy prompt">
						<CopiedContent>
							<Check className="size-4 mr-1 text-green-600" />
							Copied!
						</CopiedContent>
						<DefaultContent>
							<Copy className="size-4 mr-1" />
							Copy Prompt
						</DefaultContent>
					</Button>
				</CopyButton>
			</div>
		</div>
	);
}
