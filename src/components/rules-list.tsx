"use client";

import * as React from "react";
import { RuleCardCheckbox, RuleCardLabel, RuleCardProvider } from "src/components/rule-card-wrapper";
import { ScoreBadge } from "src/components/score-badge";
import { TruncatedDescription } from "src/components/truncated-description";
import { Checkbox } from "src/components/ui/checkbox";
import { useDisplayManifests } from "src/hooks/useDisplayManifests";
import { useManifests } from "src/lib/manifests.state";
import { useSelectAll, useSelectedRuleIds } from "src/lib/selection.state";

/**
 * Reusable component for displaying a list of rules
 * Used by all agent-specific display components
 */
export function RulesList() {
	const displayManifests = useDisplayManifests();
	const allManifests = useManifests();
	const selectedIds = useSelectedRuleIds();
	const selectAll = useSelectAll();

	const allIds = allManifests.map((m) => m.id);
	const isAllSelected = allManifests.length > 0 && selectedIds.size === allManifests.length;
	const isIndeterminate = selectedIds.size > 0 && selectedIds.size < allManifests.length;

	const selectAllId = React.useId();

	const handleMasterToggle = () => {
		if (isAllSelected) {
			selectAll([]);
		} else {
			selectAll(allIds);
		}
	};

	return (
		<div data-testid="rules-section" className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-semibold text-foreground">Rules</h2>
				{allManifests.length > 0 && (
					<label
						htmlFor={selectAllId}
						className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground"
					>
						<Checkbox
							id={selectAllId}
							checked={isAllSelected}
							onCheckedChange={handleMasterToggle}
							data-state={isIndeterminate ? "indeterminate" : isAllSelected ? "checked" : "unchecked"}
							aria-label="Select all rules"
						/>
						Select All
					</label>
				)}
			</div>
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
		</div>
	);
}
