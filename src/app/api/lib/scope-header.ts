/**
 * Parses the comma-separated `x-ai-rules-scope` header into a trimmed, non-empty `string[]`.
 * The CLI/MCP client CSV-encodes the workspace scope list; the server splits it back here.
 * @param header - The raw header value (CSV) or null when absent
 * @returns The parsed scope list (empty when the header is absent or blank)
 */
export function parseScopeHeader(header: string | null): string[] {
	if (!header) return [];
	return header
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}
