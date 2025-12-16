import type { Metadata } from "next";

/**
 * Base URL for the application
 * Update this when deploying to production
 */
export const BASE_URL =
	process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
		? `https://${process.env.VERCEL_URL}`
		: "http://localhost:3000";

/**
 * Common metadata shared across all pages
 */
export const commonMetadata = {
	applicationName: "AI Rules CLI",
	authors: [{ name: "Vo Trung Quan", url: "https://github.com/votrungquan1999" }],
	creator: "Vo Trung Quan",
	publisher: "Vo Trung Quan",
	keywords: [
		"AI rules",
		"CLI tool",
		"AI agent",
		"Cursor",
		"Windsurf",
		"Aider",
		"Continue",
		"Cody",
		"developer tools",
		"code rules",
		"TypeScript",
		"React",
		"Next.js",
		"coding standards",
		"best practices",
		"development workflow",
		"AI assistant",
		"code quality",
	],
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large" as const,
			"max-snippet": -1,
		},
	},
	icons: {
		icon: "/favicon.ico",
		apple: "/apple-touch-icon.png",
	},
	manifest: "/site.webmanifest",
};

/**
 * Default site metadata
 */
export const siteMetadata: Metadata = {
	...commonMetadata,
	metadataBase: new URL(BASE_URL),
	title: {
		default: "AI Rules CLI - Curated AI Agent Rules for Developers",
		template: "%s | AI Rules CLI",
	},
	description:
		"A command-line tool that helps developers pull curated AI agent rules from a centralized repository. Support for Cursor, Windsurf, Aider, Continue, and Cody. Discover and install TypeScript, React, Next.js, and more rules with a simple command.",
	openGraph: {
		type: "website",
		locale: "en_US",
		url: BASE_URL,
		siteName: "AI Rules CLI",
		title: "AI Rules CLI - Curated AI Agent Rules for Developers",
		description:
			"A command-line tool that helps developers pull curated AI agent rules from a centralized repository. Support for Cursor, Windsurf, Aider, Continue, and Cody.",
		images: [
			{
				url: `${BASE_URL}/ai-rules-og.png`,
				width: 1200,
				height: 630,
				alt: "AI Rules CLI - Curated AI Agent Rules",
				type: "image/png",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "AI Rules CLI - Curated AI Agent Rules for Developers",
		description:
			"Pull curated AI agent rules for Cursor, Windsurf, Aider, and more. Install TypeScript, React, Next.js rules with a simple command.",
		images: [`${BASE_URL}/ai-rules-og.png`],
		creator: "@votrungquan1999",
		site: "@ai_rules_cli",
	},
	alternates: {
		canonical: BASE_URL,
	},
	category: "technology",
};

/**
 * Generate metadata for specific pages
 */
export function generatePageMetadata({
	title,
	description,
	path = "",
	keywords = [],
	noIndex = false,
}: {
	title: string;
	description: string;
	path?: string;
	keywords?: string[];
	noIndex?: boolean;
}): Metadata {
	const url = `${BASE_URL}${path}`;
	const allKeywords = [...commonMetadata.keywords, ...keywords];

	return {
		title,
		description,
		keywords: allKeywords,
		openGraph: {
			type: "website",
			locale: "en_US",
			url,
			siteName: "AI Rules CLI",
			title: `${title} | AI Rules CLI`,
			description,
			images: [
				{
					url: `${BASE_URL}/ai-rules-og.png`,
					width: 1200,
					height: 630,
					alt: "AI Rules CLI - Curated AI Agent Rules",
					type: "image/png",
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: `${title} | AI Rules CLI`,
			description,
			images: [`${BASE_URL}/ai-rules-og.png`],
			creator: "@votrungquan1999",
			site: "@ai_rules_cli",
		},
		alternates: {
			canonical: url,
		},
		robots: noIndex
			? {
					index: false,
					follow: true,
				}
			: undefined,
	};
}
