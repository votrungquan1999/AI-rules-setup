import type { Metadata } from "next";
import { generatePageMetadata } from "src/lib/metadata";

export const metadata: Metadata = generatePageMetadata({
	title: "Select Rules",
	description:
		"Search and select AI agent rules for your project. Choose from TypeScript, React, Next.js, Tailwind CSS, and more. Generate a CLI command to install rules for Cursor, Windsurf, Aider, Continue, or Cody.",
	path: "/select-rules",
	keywords: [
		"rule selector",
		"search rules",
		"AI rules browser",
		"interactive selection",
		"CLI generator",
		"rule discovery",
	],
});

export default function SelectRulesLayout({ children }: { children: React.ReactNode }) {
	return children;
}
