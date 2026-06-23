import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** Directory names that are never descended into during discovery. */
const SKIP_DIRS = new Set<string>(["node_modules", ".git"]);

/** The config filename that marks a directory as an AI-rules project. */
const CONFIG_FILENAME = ".ai-rules.json";

/**
 * Recursively discovers every directory under `root` that contains an `.ai-rules.json` file.
 * Descends into subdirectories but never into `node_modules` or `.git`. A non-existent or
 * unreadable `root` yields an empty list rather than throwing.
 * @param root - Absolute path to the directory to scan
 * @returns Absolute paths of directories containing `.ai-rules.json`
 */
export async function discoverConfigDirs(root: string): Promise<string[]> {
	let entries: Dirent<string>[];
	try {
		entries = await readdir(root, { withFileTypes: true });
	} catch {
		// Missing or unreadable directory: nothing to discover.
		return [];
	}

	const found: string[] = [];
	const subdirs: string[] = [];

	for (const entry of entries) {
		if (entry.isFile() && entry.name === CONFIG_FILENAME) {
			found.push(root);
		} else if (entry.isDirectory() && !entry.isSymbolicLink() && !SKIP_DIRS.has(entry.name)) {
			// Symlinked dirs are intentionally not traversed — avoids cycles/escapes in --all mode.
			subdirs.push(join(root, entry.name));
		}
	}

	for (const subdir of subdirs) {
		found.push(...(await discoverConfigDirs(subdir)));
	}

	return found;
}
