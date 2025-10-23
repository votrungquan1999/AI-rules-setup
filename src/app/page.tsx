export default function HomePage() {
	return (
		<div style={{ padding: "2rem", fontFamily: "monospace" }}>
			<h1>AI Rules API Server</h1>
			<p>This is the API server for the AI Rules CLI tool.</p>

			<h2>Available Endpoints</h2>
			<ul>
				<li>
					<strong>GET /api/rules</strong> - Fetch all available rules from GitHub repository
					<br />
					<small>Returns structured data with agents, categories, manifests, and file contents</small>
				</li>
			</ul>

			<h2>Usage</h2>
			<p>
				This API is designed to be used by the AI Rules CLI tool. It caches GitHub repository content for 5 minutes to
				improve performance and reduce API rate limiting.
			</p>

			<h2>Configuration</h2>
			<p>
				Set the <code>AI_RULES_API_URL</code> environment variable to point to this server (default:
				https://ai-rules-setup.vercel.app)
			</p>
		</div>
	);
}
