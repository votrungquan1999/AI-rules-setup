"use client";

import { usePresets } from "src/lib/manifests.state";
import { useApplyPreset } from "src/lib/selection.state";

/**
 * Preset quick-start cards displayed in the content view.
 * Shows available tech-stack presets for the selected agent.
 */
export function PresetCards() {
	const presets = usePresets();
	const applyPreset = useApplyPreset();

	if (presets.length === 0) {
		return null;
	}

	return (
		<div data-testid="preset-cards" className="mb-6">
			<h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Start Presets</h3>
			<div className="flex flex-wrap gap-3">
				{presets.map((preset) => (
					<button
						key={preset.id}
						type="button"
						data-testid={`preset-card-${preset.id}`}
						onClick={() => applyPreset(preset)}
						className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-card hover:border-primary hover:bg-accent transition-colors cursor-pointer"
					>
						<span className="text-lg">{preset.icon}</span>
						<div className="text-left">
							<span className="text-sm font-medium text-foreground">{preset.name}</span>
							<p className="text-xs text-muted-foreground">{preset.description}</p>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
