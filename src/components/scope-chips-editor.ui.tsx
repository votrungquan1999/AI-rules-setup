"use client";

import { useId, useState } from "react";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";

/**
 * Controlled add/remove-chips editor for a list of scope tags, shared by the KB review and private
 * skills edit dialogs. The current tags render as chips with an × to remove; typing a tag and
 * pressing Enter adds one. An empty list represents "global". The parent owns the tag list via
 * `value`/`onChange`; this component only owns the in-progress text being typed.
 * @param value - The current scope tags
 * @param onChange - Called with the next tag list whenever a chip is added or removed
 * @param label - Accessible label for the tag input
 */
export function ScopeChipsEditor({
	value,
	onChange,
	label,
}: {
	value: string[];
	onChange: (next: string[]) => void;
	label: string;
}) {
	const [draft, setDraft] = useState("");
	const inputId = useId();

	/**
	 * Adds the typed tag as a chip when Enter is pressed. Trims the input, ignores empty input, and
	 * skips tags already present so a duplicate chip is never created. Clears the input after adding.
	 * @param event - The keydown event from the tag input
	 */
	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key !== "Enter") return;
		event.preventDefault();
		const tag = draft.trim();
		if (tag.length === 0 || value.includes(tag)) {
			setDraft("");
			return;
		}
		onChange([...value, tag]);
		setDraft("");
	}

	return (
		<div className="space-y-2">
			<Label htmlFor={inputId}>{label}</Label>
			<div className="flex flex-wrap gap-2">
				{value.map((tag) => (
					<span
						key={tag}
						className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
					>
						{tag}
						<button
							type="button"
							aria-label={`Remove ${tag}`}
							className="text-muted-foreground"
							onClick={() => onChange(value.filter((t) => t !== tag))}
						>
							×
						</button>
					</span>
				))}
			</div>
			<Input id={inputId} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} />
		</div>
	);
}
