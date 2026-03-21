"use client";

import { useAgents } from "src/lib/manifests.state";
import { useSetAgent } from "src/lib/selection.state";

/**
 * Agent landing page shown on first load before agent is confirmed.
 * Displays large cards for each available agent.
 */
export function AgentLanding() {
	const agents = useAgents();
	const setAgent = useSetAgent();

	return (
		<div data-testid="agent-landing" className="flex flex-col items-center gap-8 py-12">
			<div className="text-center">
				<h2 className="text-2xl font-semibold text-foreground mb-2">Choose your AI agent</h2>
				<p className="text-muted-foreground">You can change this anytime</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
				{agents.map((agent) => (
					<button
						key={agent}
						type="button"
						data-testid={`agent-card-${agent}`}
						onClick={() => setAgent(agent)}
						className="flex flex-col items-center gap-3 p-6 border-2 border-border rounded-xl bg-card hover:border-primary hover:bg-accent transition-colors cursor-pointer"
					>
						<span className="text-3xl">{getAgentIcon(agent)}</span>
						<span className="text-lg font-semibold text-foreground">{formatAgentName(agent)}</span>
						<span className="text-sm text-muted-foreground text-center">{getAgentDescription(agent)}</span>
					</button>
				))}
			</div>
		</div>
	);
}

function getAgentIcon(agent: string): string {
	const icons: Record<string, string> = {
		antigravity: "🚀",
		"claude-code": "🤖",
		cursor: "📝",
	};
	return icons[agent] ?? "⚡";
}

function formatAgentName(agent: string): string {
	const names: Record<string, string> = {
		antigravity: "Antigravity",
		"claude-code": "Claude Code",
		cursor: "Cursor",
	};
	return names[agent] ?? agent;
}

function getAgentDescription(agent: string): string {
	const descriptions: Record<string, string> = {
		antigravity: "Google's AI coding assistant with skills, workflows, and rules",
		"claude-code": "Anthropic's AI agent with skills and rules",
		cursor: "AI-powered code editor with rules",
	};
	return descriptions[agent] ?? "AI coding assistant";
}
