"use client";

import { X } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useSelectedRuleIds, useToggleSelection } from "src/lib/selection.state";
import type { Manifest } from "src/server/types";

interface SelectedRulesSidebarProps {
	/** All available manifests (to look up names from IDs) */
	manifests: Manifest[];
}

/**
 * Sidebar showing selected rules with remove buttons using shadcn Button
 */
export function SelectedRulesSidebar({ manifests }: SelectedRulesSidebarProps) {
	const selectedIds = useSelectedRuleIds();
	const toggleSelection = useToggleSelection();

	// Get manifests for selected IDs
	const selectedManifests = manifests.filter((m) => selectedIds.has(m.id));

	return (
		<div className="p-6 border-b border-border">
			<h2 className="text-lg font-semibold text-foreground mb-4">Selected Rules ({selectedIds.size})</h2>

			{selectedManifests.length === 0 ? (
				<p className="text-sm text-muted-foreground">No rules selected yet.</p>
			) : (
				<div className="space-y-2">
					{selectedManifests.map((manifest) => (
						<div key={manifest.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50">
							<span className="text-sm text-foreground truncate">{manifest.id}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={(e) => {
									e.stopPropagation();
									toggleSelection(manifest.id);
								}}
								className="shrink-0 size-6 hover:bg-destructive/20 hover:text-destructive"
								aria-label={`Remove ${manifest.id}`}
							>
								<X className="size-4" />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
