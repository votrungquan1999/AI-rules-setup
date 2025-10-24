import Link from "next/link";

export default function HomePage() {
	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-4xl">
				<div className="mb-8">
					<h1 className="text-4xl font-bold text-foreground mb-4">AI Rules CLI</h1>
					<p className="text-lg text-muted-foreground">
						A command-line tool that helps developers pull curated AI agent rules from a centralized repository into
						their projects.
					</p>
				</div>

				<div className="bg-primary/10 border border-primary rounded-lg p-6 mb-8">
					<h2 className="text-2xl font-semibold text-foreground mb-3">🎯 Select Rules via Web UI</h2>
					<p className="text-muted-foreground mb-4">
						Use our web interface to search and select rules, then generate a non-interactive CLI command to install
						them.
					</p>
					<Link
						href="/select-rules"
						className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
					>
						Open Rule Selector →
					</Link>
				</div>

				<div className="space-y-6">
					<section>
						<h2 className="text-2xl font-semibold text-foreground mb-3">API Endpoints</h2>
						<div className="bg-card border border-border rounded-lg p-4">
							<div className="mb-3">
								<code className="text-sm font-mono bg-muted px-2 py-1 rounded">GET /api/rules</code>
								<p className="text-sm text-muted-foreground mt-1">
									Fetch all available rules from MongoDB cache with GitHub fallback
								</p>
							</div>
						</div>
					</section>

					<section>
						<h2 className="text-2xl font-semibold text-foreground mb-3">CLI Usage</h2>
						<div className="bg-card border border-border rounded-lg p-4 space-y-3">
							<div>
								<h3 className="font-semibold text-foreground mb-1">Interactive Mode</h3>
								<code className="text-sm font-mono bg-muted px-2 py-1 rounded block">ai-rules init</code>
							</div>
							<div>
								<h3 className="font-semibold text-foreground mb-1">Non-Interactive Mode</h3>
								<code className="text-sm font-mono bg-muted px-2 py-1 rounded block">
									ai-rules init --agent cursor --categories typescript,react-hooks --overwrite-strategy force
								</code>
							</div>
						</div>
					</section>

					<section>
						<h2 className="text-2xl font-semibold text-foreground mb-3">Configuration</h2>
						<div className="bg-card border border-border rounded-lg p-4">
							<p className="text-sm text-muted-foreground mb-2">
								Set the <code className="bg-muted px-1 py-0.5 rounded">AI_RULES_API_URL</code> environment variable to
								point to this server:
							</p>
							<code className="text-sm font-mono bg-muted px-2 py-1 rounded block">
								AI_RULES_API_URL=https://ai-rules-setup.vercel.app
							</code>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
