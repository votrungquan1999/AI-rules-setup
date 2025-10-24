import { AgentSelector } from "src/components/agent-selector";
import { CommandDisplay } from "src/components/command-display";
import { RuleCardProvider, RuleCardLabel, RuleCardCheckbox } from "src/components/rule-card-wrapper";
import { ScoreBadge } from "src/components/score-badge";
import { SearchInput } from "src/components/search-input";
import { SelectedRulesSidebar } from "src/components/selected-rules-sidebar";
import { StrategySelector } from "src/components/strategy-selector";
import { TruncatedDescription } from "src/components/truncated-description";
import { SearchProvider } from "src/lib/search.state";
import { SelectionProvider } from "src/lib/selection.state";
import { findAllStoredRules } from "src/server/rules-repository";

/**
 * Rule selection page - Server component
 * Fetches rules from MongoDB and renders with client contexts
 */
export default async function SelectRulesPage() {
	"use cache";

	const rulesData = await findAllStoredRules();

	if (!rulesData || !rulesData.agents) {
		return (
			<div className="min-h-screen bg-background p-8">
				<div className="max-w-7xl mx-auto">
					<h1 className="text-3xl font-bold mb-4 text-foreground">AI Rules Selector</h1>
					<div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
						<p className="text-destructive font-semibold">No rules data available</p>
						<p className="text-muted-foreground mt-2">
							The rules database is empty. Please ensure the API server has fetched rules from GitHub.
						</p>
					</div>
				</div>
			</div>
		);
	}

	// Flatten rules for easier processing
	const agents = Object.keys(rulesData.agents);
	const defaultAgent = agents[0] || "cursor";

	// Get all manifests for the first agent
	const firstAgentCategories = rulesData.agents[defaultAgent]?.categories || {};
	const manifests = Object.values(firstAgentCategories).map((cat) => cat.manifest);

	return (
		<SearchProvider manifests={manifests}>
			<SelectionProvider defaultAgent={defaultAgent}>
				<div className="min-h-screen bg-background">
					<div className="max-w-7xl mx-auto p-8">
						{/* Header */}
						<div className="mb-8">
							<h1 className="text-4xl font-bold mb-2 text-foreground">AI Rules Selector</h1>
							<p className="text-muted-foreground text-lg">
								Search for rules and generate a CLI command to install them
							</p>
						</div>

						<div className="grid grid-cols-[1fr_400px] gap-6">
							{/* Main content */}
							<div className="space-y-4">
								{/* Agent selector */}
								<AgentSelector agents={agents} />

								{/* Search input */}
								<SearchInput />

								{/* Rules list */}
								<div className="flex flex-col gap-3">
									{manifests.map((manifest) => (
										<RuleCardProvider key={manifest.id} ruleId={manifest.id}>
											<RuleCardLabel>
												<div className="flex items-start gap-3">
													{/* Checkbox */}
													<div className="mt-1">
														<RuleCardCheckbox />
													</div>

													{/* Server-rendered content */}
													<div className="flex-1 min-w-0 space-y-2">
														<div className="flex items-center gap-2">
															<h3 className="font-semibold text-foreground">{manifest.id}</h3>
															<ScoreBadge />
														</div>
														<TruncatedDescription text={manifest.description} />
														{manifest.tags.length > 0 && (
															<div className="flex flex-wrap gap-1">
																{manifest.tags.slice(0, 5).map((tag) => (
																	<span key={tag} className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
																		{tag}
																	</span>
																))}
																{manifest.tags.length > 5 && (
																	<span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
																		+{manifest.tags.length - 5}
																	</span>
																)}
															</div>
														)}
													</div>
												</div>
											</RuleCardLabel>
										</RuleCardProvider>
									))}
								</div>
							</div>

							{/* Sidebar */}
							<div className="border border-border rounded-lg bg-card">
								<SelectedRulesSidebar manifests={manifests} />

								<div className="p-6 border-b border-border">
									<StrategySelector />
								</div>

								<div className="p-6">
									<CommandDisplay />
								</div>
							</div>
						</div>
					</div>
				</div>
			</SelectionProvider>
		</SearchProvider>
	);
}
