"use client";

import { Check, ChevronDown, Copy, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "src/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";
import { usePresets, useSkills, useWorkflows } from "src/lib/manifests.state";
import { generateChatGptPrompt } from "src/lib/prompt-generator";
import { useApplyPreset, useSelectedAgent } from "src/lib/selection.state";
import type { Manifest } from "src/server/types";
import { CopiedContent, CopyButton, DefaultContent } from "./copy-button";

interface GettingStartedBannerProps {
	manifests: Manifest[];
}

/**
 * Prominent two-column getting started card.
 * Left: preset dropdown with title + description per option.
 * Right: copy ChatGPT prompt action.
 */
export function GettingStartedBanner({ manifests }: GettingStartedBannerProps) {
	const agent = useSelectedAgent();
	const skills = useSkills();
	const workflows = useWorkflows();
	const presets = usePresets();
	const applyPreset = useApplyPreset();
	const prompt = generateChatGptPrompt(manifests, agent, skills, workflows);

	const hasPresets = presets.length > 0;

	return (
		<div
			data-testid="getting-started-banner"
			className="p-6 mb-4 rounded-xl border-2 border-border bg-accent/20"
		>
			<div className="flex items-center gap-2 mb-4">
				<Lightbulb className="size-5 text-yellow-500" />
				<h2 className="text-lg font-semibold text-foreground">
					Not sure where to start?
				</h2>
			</div>

			<div className={`grid ${hasPresets ? "grid-cols-2" : "grid-cols-1"} gap-6`}>
				{/* Left: Preset dropdown */}
				{hasPresets && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2 mb-1">
							<Sparkles className="size-4 text-primary" />
							<span className="text-sm font-medium text-foreground">
								Select a Preset
							</span>
						</div>
						<p className="text-xs text-muted-foreground mb-2">
							Pick a tech-stack preset to auto-select relevant skills, workflows, and rules.
						</p>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="outline"
									className="w-full justify-between"
									data-testid="preset-dropdown-trigger"
								>
									Choose a preset…
									<ChevronDown className="size-4 ml-2 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
								{presets.map((preset) => (
									<DropdownMenuItem
										key={preset.id}
										data-testid={`preset-option-${preset.id}`}
										onSelect={() => applyPreset(preset)}
										className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
									>
										<div className="flex items-center gap-2">
											<span className="text-base">{preset.icon}</span>
											<span className="font-medium text-foreground">{preset.name}</span>
										</div>
										<span className="text-xs text-muted-foreground pl-7">
											{preset.description}
										</span>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}

				{/* Right: Copy ChatGPT prompt */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2 mb-1">
						<Copy className="size-4 text-primary" />
						<span className="text-sm font-medium text-foreground">
							Ask ChatGPT
						</span>
					</div>
					<p className="text-xs text-muted-foreground mb-2">
						Copy a prompt and paste it into ChatGPT to get personalized recommendations.
					</p>
					<CopyButton value={prompt} asChild>
						<Button
							type="button"
							variant="outline"
							className="w-full"
							aria-label="Copy prompt"
						>
							<CopiedContent>
								<Check className="size-4 mr-2 text-green-600" />
								Copied!
							</CopiedContent>
							<DefaultContent>
								<Copy className="size-4 mr-2" />
								Copy Prompt
							</DefaultContent>
						</Button>
					</CopyButton>
				</div>
			</div>
		</div>
	);
}
