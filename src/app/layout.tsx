import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI Rules API",
	description: "API server for fetching and caching AI agent rules from GitHub",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
