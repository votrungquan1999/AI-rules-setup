"use client";

import { Search } from "lucide-react";
import { Input } from "src/components/ui/input";
import { useSearchQuery, useSetSearchQuery } from "src/lib/search.state";

/**
 * Search input component with icon using shadcn Input
 * Uses search context for state management
 */
export function SearchInput() {
	const query = useSearchQuery();
	const setQuery = useSetSearchQuery();

	return (
		<div className="relative">
			<Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
			<Input
				type="text"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder="Describe your tech stack (e.g., 'Next.js with TypeScript and Tailwind')..."
				className="w-full pl-12 pr-4 py-3"
			/>
		</div>
	);
}
