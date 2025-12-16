import type { MetadataRoute } from "next";

/**
 * Web app manifest for PWA support
 */
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "AI Rules CLI",
		short_name: "AI Rules",
		description: "Curated AI agent rules for developers - Support for Cursor, Windsurf, Aider, Continue, and Cody",
		start_url: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#0a0a0a",
		icons: [
			{
				src: "/favicon.ico",
				sizes: "any",
				type: "image/x-icon",
			},
		],
		categories: ["development", "productivity", "utilities"],
	};
}
