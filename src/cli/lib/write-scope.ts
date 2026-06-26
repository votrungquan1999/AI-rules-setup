interface WriteScopeOptions {
	scope?: string | undefined;
	global?: boolean | undefined;
}

/**
 * Resolves the scope tags for a command that WRITES to the central system (skill upload, kb capture).
 * The operator must state visibility explicitly — this never reads `.ai-rules.json`.
 * @param opts - The `--scope` CSV and `--global` flag as parsed by commander
 * @returns The resolved scope tags (`[]` means global, visible to every workspace)
 */
export function resolveWriteScope(opts: WriteScopeOptions): string[] {
	const tags = (opts.scope ?? "")
		.split(",")
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);

	if (opts.global && tags.length > 0) {
		throw new Error("--scope and --global are mutually exclusive — pass one, not both.");
	}
	if (opts.global) return [];
	if (tags.length === 0) {
		throw new Error("You must specify --scope <tags> or --global (global = empty scope, visible to every workspace).");
	}
	return tags;
}
