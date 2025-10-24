"use client";

import type { OverwriteStrategy } from "src/cli/lib/types";
import { Label } from "src/components/ui/label";
import { RadioGroup, RadioGroupItem } from "src/components/ui/radio-group";
import { useOverwriteStrategy, useSetOverwriteStrategy } from "src/lib/selection.state";

/**
 * Strategy option interface
 */
interface StrategyOption {
	value: OverwriteStrategy;
	label: string;
	description: string;
}

/**
 * Available strategy options
 */
const strategies: StrategyOption[] = [
	{ value: "prompt", label: "Ask me", description: "Prompt for each conflict" },
	{ value: "force", label: "Force overwrite", description: "Overwrite all existing files" },
	{ value: "skip", label: "Skip existing", description: "Keep existing files" },
];

/**
 * Radio button selector for overwrite strategy using shadcn RadioGroup
 * Uses selection context for state management
 */
export function StrategySelector() {
	const strategy = useOverwriteStrategy();
	const setStrategy = useSetOverwriteStrategy();

	return (
		<div>
			<h3 className="text-sm font-semibold text-foreground mb-3">Conflict Resolution</h3>
			<RadioGroup value={strategy} onValueChange={(value) => setStrategy(value as OverwriteStrategy)}>
				<div className="space-y-2">
					{strategies.map((option) => (
						<div
							key={option.value}
							className="flex items-start gap-3 p-3 rounded border border-border hover:bg-muted/50 cursor-pointer transition-colors"
						>
							<RadioGroupItem value={option.value} id={`strategy-${option.value}`} className="mt-0.5" />
							<Label htmlFor={`strategy-${option.value}`} className="flex-1 cursor-pointer">
								<div className="text-sm font-medium text-foreground">{option.label}</div>
								<div className="text-xs text-muted-foreground">{option.description}</div>
							</Label>
						</div>
					))}
				</div>
			</RadioGroup>
		</div>
	);
}
