"use client";

import { RuleCardCheckbox, RuleCardLabel, RuleCardProvider } from "src/components/rule-card-wrapper";
import { ScoreBadge } from "src/components/score-badge";
import { TruncatedDescription } from "src/components/truncated-description";
import { useDisplayManifests } from "src/hooks/useDisplayManifests";
import { useManifests } from "src/lib/manifests.state";

/**
 * Display component for Cursor agent rules
 */
export function CursorRulesDisplay() {
	const displayManifests = useDisplayManifests();
	const allManifests = useManifests();

	return (
		<div className="flex flex-col gap-3">
			{allManifests.length === 0 ? (
				<div data-testid="empty-state" className="p-6 text-center text-muted-foreground">
					No rules available for the selected agent.
				</div>
			) : displayManifests.length === 0 ? (
				<div data-testid="no-search-results" className="p-6 text-center text-muted-foreground">
					No rules match your search.
				</div>
			) : (
				displayManifests.map((manifest) => (
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
				))
			)}
		</div>
	);
}
