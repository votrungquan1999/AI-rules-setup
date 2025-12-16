import { BASE_URL } from "src/lib/metadata";

/**
 * JSON-LD structured data for SEO
 * Helps search engines understand the content and purpose of the site
 */
export function StructuredData() {
	const structuredData = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "SoftwareApplication",
				name: "AI Rules CLI",
				applicationCategory: "DeveloperApplication",
				operatingSystem: "Linux, macOS, Windows",
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
				description:
					"A command-line tool that helps developers pull curated AI agent rules from a centralized repository into their projects.",
				url: BASE_URL,
				author: {
					"@type": "Person",
					name: "Vo Trung Quan",
					url: "https://github.com/votrungquan1999",
				},
				screenshot: `${BASE_URL}/ai-rules-og.png`,
				softwareVersion: "0.1.0",
				aggregateRating: {
					"@type": "AggregateRating",
					ratingValue: "5",
					ratingCount: "1",
				},
				keywords: [
					"AI rules",
					"CLI tool",
					"developer tools",
					"Cursor",
					"Windsurf",
					"Aider",
					"TypeScript",
					"React",
					"code quality",
				],
			},
			{
				"@type": "WebSite",
				"@id": `${BASE_URL}/#website`,
				url: BASE_URL,
				name: "AI Rules CLI",
				description: "Curated AI agent rules for developers - Support for Cursor, Windsurf, Aider, Continue, and Cody",
				publisher: {
					"@type": "Person",
					name: "Vo Trung Quan",
				},
				potentialAction: {
					"@type": "SearchAction",
					target: {
						"@type": "EntryPoint",
						urlTemplate: `${BASE_URL}/select-rules?q={search_term_string}`,
					},
					"query-input": "required name=search_term_string",
				},
			},
			{
				"@type": "WebPage",
				"@id": `${BASE_URL}/#webpage`,
				url: BASE_URL,
				name: "AI Rules CLI - Curated AI Agent Rules for Developers",
				isPartOf: {
					"@id": `${BASE_URL}/#website`,
				},
				description:
					"A command-line tool that helps developers pull curated AI agent rules from a centralized repository. Support for Cursor, Windsurf, Aider, Continue, and Cody.",
				breadcrumb: {
					"@type": "BreadcrumbList",
					itemListElement: [
						{
							"@type": "ListItem",
							position: 1,
							name: "Home",
							item: BASE_URL,
						},
						{
							"@type": "ListItem",
							position: 2,
							name: "Select Rules",
							item: `${BASE_URL}/select-rules`,
						},
					],
				},
			},
			{
				"@type": "Organization",
				"@id": `${BASE_URL}/#organization`,
				name: "AI Rules CLI",
				url: BASE_URL,
				logo: {
					"@type": "ImageObject",
					url: `${BASE_URL}/ai-rules-og.png`,
				},
				sameAs: ["https://github.com/votrungquan1999/AI-rules-setup"],
			},
		],
	};

	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data
			dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
		/>
	);
}
