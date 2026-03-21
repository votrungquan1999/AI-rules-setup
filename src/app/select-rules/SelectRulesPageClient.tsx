"use client";

import { AgentLanding } from "src/components/agent-landing";
import { AgentSelector } from "src/components/agent-selector";
import { CommandDisplay } from "src/components/command-display";
import { GettingStartedBanner } from "src/components/getting-started-banner";
import { PresetCards } from "src/components/preset-cards";
import { PromptDisplay } from "src/components/prompt-display";
// import { QuestionsDialog } from "src/components/questions-dialog";
import { SearchInput } from "src/components/search-input";
import { SelectedRulesSidebar } from "src/components/selected-rules-sidebar";
import { StrategySelector } from "src/components/strategy-selector";
import { useManifests } from "src/lib/manifests.state";
import { useHasSelectedAgent, useSelectedAgent } from "src/lib/selection.state";
import { AntigravityDisplay } from "./antigravity-display";
import { ClaudeCodeDisplay } from "./claude-code-display";
import { CursorRulesDisplay } from "./cursor-rules-display";

/**
 * Client component for rule selection page
 * Must be inside SelectionProvider, ManifestsProvider, and SearchProvider
 * Shows agent landing cards on first load, then content view after agent is confirmed
 */
export function SelectRulesPageClient() {
	const allManifests = useManifests();
	const selectedAgent = useSelectedAgent();
	const hasSelectedAgent = useHasSelectedAgent();

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto p-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-4xl font-bold mb-2 text-foreground">AI Agent Setup</h1>
					<p className="text-muted-foreground text-lg">Select skills, workflows, and rules for your AI agent</p>
				</div>

				{!hasSelectedAgent ? (
					<AgentLanding />
				) : (
					<div data-testid="content-area" className="grid grid-cols-[1fr_400px] gap-6">
						{/* Main content */}
						<div className="space-y-4">
							<PresetCards />
							<GettingStartedBanner manifests={allManifests} />
							<AgentSelector />
							<SearchInput />

							{selectedAgent === "antigravity" ? (
								<AntigravityDisplay />
							) : selectedAgent === "claude-code" ? (
								<ClaudeCodeDisplay />
							) : (
								<CursorRulesDisplay />
							)}
						</div>

						{/* Sidebar */}
						<div className="border border-border rounded-lg bg-card">
							<SelectedRulesSidebar manifests={allManifests} />

							<div className="p-6 border-b border-border">
								<StrategySelector />
							</div>

							<div className="p-6 border-b border-border">
								<PromptDisplay manifests={allManifests} />
							</div>

							<div className="p-6">
								<CommandDisplay manifests={allManifests} />
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
