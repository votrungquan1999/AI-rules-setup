import { constants } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { AIAgent, type ConflictResult } from "./types";

/**
 * Resolves `targetPath` under `targetDir` and guarantees the result stays inside `targetDir`.
 * Catalog-controlled names (skill name, supporting-file path, workflow name, hook name) flow into
 * write paths, so a poisoned `../`-bearing value could otherwise escape the project. Throws on escape.
 * @param targetDir - Absolute path to the project directory
 * @param targetPath - Project-relative path derived from catalog data
 * @returns The absolute write path, guaranteed to be within `targetDir`
 */
export function resolveWithinDir(targetDir: string, targetPath: string): string {
	const base = resolve(targetDir);
	const full = resolve(base, targetPath);
	if (full !== base && !full.startsWith(base + sep)) {
		throw new Error(`Refusing to write outside the project directory: ${targetPath}`);
	}
	return full;
}

/**
 * Detects if a file conflict exists at the given path
 * @param filePath - Path to check for conflicts
 * @returns Conflict detection result
 */
export async function detectConflict(filePath: string): Promise<ConflictResult> {
	try {
		await access(filePath, constants.F_OK);
		return {
			hasConflict: true,
		};
	} catch {
		return {
			hasConflict: false,
		};
	}
}

/**
 * Writes rule file content to the specified path, creating directories as needed
 * @param content - Content to write to the file
 * @param targetPath - Target file path
 */
export async function writeRuleFile(content: string, targetPath: string): Promise<void> {
	// Create directory structure if it doesn't exist
	const dir = dirname(targetPath);
	await mkdir(dir, { recursive: true });

	// Write the file
	await writeFile(targetPath, content, "utf-8");
}

/**
 * Applies tool-specific naming conventions to convert source filename to target path
 * @param agent - AI agent type
 * @param filename - Source filename (preserves original extension)
 * @returns Target file path following agent conventions
 */
export function applyNamingConvention(agent: AIAgent, filename: string): string {
	switch (agent) {
		case AIAgent.CURSOR:
			return `.cursor/rules/${filename}`;

		case AIAgent.WINDSURF:
			// For Windsurf, use the filename as the category name but keep original extension
			return `.windsurf/rules/${filename}`;

		case AIAgent.AIDER:
			return `.aider/rules/${filename}`;

		case AIAgent.CONTINUE:
			return `.continue/rules/${filename}`;

		case AIAgent.CODY:
			return `.cody/rules/${filename}`;

		case AIAgent.CLAUDE_CODE:
			return `.claude/rules/${filename}`;

		case AIAgent.ANTIGRAVITY:
			return `.agents/rules/${filename}`;

		default:
			throw new Error(`Unsupported AI agent: ${agent}`);
	}
}

/**
 * Applies skill-specific naming conventions for skill files
 * Converts flat file structure (skill-name.md) to directory structure (skill-name/SKILL.md)
 * @param agent - AI agent type
 * @param skillName - Name of the skill (without .md extension)
 * @returns Target file path for the skill
 */
export function applySkillNamingConvention(agent: AIAgent, skillName: string): string {
	switch (agent) {
		case AIAgent.CURSOR:
			// Cursor uses .cursor/skills/ directory
			return `.cursor/skills/${skillName}/SKILL.md`;

		case AIAgent.CLAUDE_CODE:
			// Convert skill-name to skill-name/SKILL.md
			return `.claude/skills/${skillName}/SKILL.md`;

		case AIAgent.ANTIGRAVITY:
			// Follows agentskills.io standard: skill-name/SKILL.md
			return `.agents/skills/${skillName}/SKILL.md`;

		default:
			throw new Error(`Skills are not supported for agent: ${agent}`);
	}
}

/**
 * Applies naming conventions for supporting files within a skill directory
 * @param agent - AI agent type
 * @param skillName - Name of the skill
 * @param relativePath - Relative path within the skill directory (e.g., 'nodes/node-research.md')
 * @returns Target file path for the supporting file
 */
export function applySkillFileNamingConvention(agent: AIAgent, skillName: string, relativePath: string): string {
	const skillBase = applySkillNamingConvention(agent, skillName);
	return skillBase.replace(/SKILL\.md$/, relativePath);
}

/**
 * Applies naming conventions for hook files, mirroring the skill supporting-file pattern.
 * @param agent - AI agent type (hooks currently only supported for claude-code)
 * @param hookName - Name of the hook
 * @param filename - Filename within the hook (e.g. the script, or a supporting file's relative path)
 * @returns Target file path for the hook file
 */
export function applyHookNamingConvention(agent: AIAgent, hookName: string, filename: string): string {
	switch (agent) {
		case AIAgent.CLAUDE_CODE:
			return `.claude/hooks/${hookName}/${filename}`;

		default:
			throw new Error(`Hooks are not supported for agent: ${agent}`);
	}
}

/**
 * Reads and parses a JSON file, returning `defaultValue` when it doesn't exist. FAIL-CLOSED: throws
 * a clear error if the file exists but isn't valid JSON — callers must never silently clobber it.
 * @param filePath - Absolute path to the JSON file
 * @param defaultValue - Value to return when the file doesn't exist (or is otherwise unreadable)
 * @param label - Human-readable name for the error message (e.g. "hook settings")
 * @returns The parsed JSON, or `defaultValue` when the file is absent
 */
async function readJsonFileFailClosed<T>(filePath: string, defaultValue: T, label: string): Promise<T> {
	let raw: string | undefined;
	try {
		raw = await readFile(filePath, "utf-8");
	} catch {
		return defaultValue;
	}

	try {
		return JSON.parse(raw) as T;
	} catch {
		throw new Error(`Cannot read ${label}: ${filePath} exists but is not valid JSON. Fix or remove it, then retry.`);
	}
}

/** Fragment of `.claude/settings.json`'s `hooks` key, keyed by event name (e.g. `UserPromptSubmit`). */
export interface HookSettingsFragment {
	hooks: Record<string, unknown[]>;
}

/**
 * Deep-merges a hook's settings fragment into the project's `.claude/settings.json`, preserving
 * any hand-written hooks already registered there.
 * @param targetDir - Absolute path to the project directory
 * @param fragment - The hook's settings fragment (its `hooks.<event>` entries)
 */
export async function mergeSettingsJson(targetDir: string, fragment: HookSettingsFragment): Promise<void> {
	const settingsPath = resolveWithinDir(targetDir, ".claude/settings.json");
	const existing = await readJsonFileFailClosed<Record<string, unknown>>(settingsPath, {}, "hook settings");

	const existingHooks = (existing.hooks as Record<string, unknown[]> | undefined) ?? {};

	for (const [event, groups] of Object.entries(fragment.hooks)) {
		const merged = existingHooks[event] ?? [];
		// De-dupe by exact serialized match so re-merging the same fragment (e.g. on `pull`) is idempotent.
		for (const group of groups) {
			const alreadyPresent = merged.some((g) => JSON.stringify(g) === JSON.stringify(group));
			if (!alreadyPresent) merged.push(group);
		}
		existingHooks[event] = merged;
	}

	existing.hooks = existingHooks;

	await mkdir(dirname(settingsPath), { recursive: true });
	await writeFile(settingsPath, `${JSON.stringify(existing, null, 2)}\n`, "utf-8");
}

/** A single managed hook's record in the `.claude/.ai-rules-managed.json` sidecar. */
export interface ManagedHookEntry {
	/** Which `settings.json` `hooks.<event>` array this hook's registration lives under. */
	event: string;
	/** The exact command string written into `hooks.<event>[].hooks[].command` — prune matches on this. */
	command: string;
	/** On-disk path of the installed script, so prune can also remove it. */
	scriptPath: string;
}

/**
 * Records a hook as ai-rules-managed in the project's `.claude/.ai-rules-managed.json` sidecar, so
 * `sync` can later prune only entries it itself installed — never a hand-written hook.
 * @param targetDir - Absolute path to the project directory
 * @param hookName - The hook's catalog name (the sidecar's join key)
 * @param entry - The event/command/scriptPath this install wrote
 */
export async function recordManagedHook(targetDir: string, hookName: string, entry: ManagedHookEntry): Promise<void> {
	const sidecarPath = resolveWithinDir(targetDir, ".claude/.ai-rules-managed.json");
	const sidecar = await readJsonFileFailClosed<ManagedHooksSidecar>(
		sidecarPath,
		{ version: 1, managedHooks: {} },
		"managed hooks sidecar",
	);

	sidecar.managedHooks[hookName] = entry;

	await mkdir(dirname(sidecarPath), { recursive: true });
	await writeFile(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`, "utf-8");
}

/** Shape of the `.claude/.ai-rules-managed.json` sidecar. */
interface ManagedHooksSidecar {
	version: number;
	managedHooks: Record<string, ManagedHookEntry>;
}

/**
 * Reads the project's managed-hooks sidecar, keyed by hook name. Returns an empty map when the
 * sidecar doesn't exist yet (e.g. before any hook has ever been installed).
 * @param targetDir - Absolute path to the project directory
 * @returns The `managedHooks` map (empty when the sidecar is absent)
 */
export async function readManagedHooks(targetDir: string): Promise<Record<string, ManagedHookEntry>> {
	const sidecarPath = resolveWithinDir(targetDir, ".claude/.ai-rules-managed.json");
	const sidecar = await readJsonFileFailClosed<ManagedHooksSidecar>(
		sidecarPath,
		{ version: 1, managedHooks: {} },
		"managed hooks sidecar",
	);
	return sidecar.managedHooks;
}

/**
 * Prunes an ai-rules-managed hook that has dropped out of the fetched catalog: removes its exact
 * command entry from `.claude/settings.json` (never touching a hand-written entry, since it's
 * matched by the sidecar's own recorded command string), deletes its `.claude/hooks/<name>/` script
 * directory, and removes it from the sidecar. No-ops gracefully when settings.json/the sidecar are
 * already absent.
 * @param targetDir - Absolute path to the project directory
 * @param hookName - The hook's catalog name (the sidecar's join key)
 * @param entry - The sidecar's recorded event/command/scriptPath for this hook
 */
/**
 * Removes a single command's registration from `.claude/settings.json`'s `hooks.<event>` array,
 * collapsing an emptied matcher-group and dropping the event key when it empties. Matched by the
 * EXACT command string, so a hand-written entry is never touched. No-ops when settings.json or the
 * event/command is absent. Used both to prune a dropped hook and to clear a hook's stale command
 * before re-registering it with a changed one.
 * @param targetDir - Absolute path to the project directory
 * @param event - The `hooks.<event>` key the command lives under (e.g. `UserPromptSubmit`)
 * @param command - The exact command string to remove
 */
export async function removeHookFromSettings(targetDir: string, event: string, command: string): Promise<void> {
	const settingsPath = resolveWithinDir(targetDir, ".claude/settings.json");
	const settings = await readJsonFileFailClosed<Record<string, unknown>>(settingsPath, {}, "hook settings");
	const hooksByEvent =
		(settings.hooks as Record<string, Array<{ hooks: Array<{ command: string }> }>> | undefined) ?? {};

	const groups = hooksByEvent[event];
	if (!groups) return;

	// Drop only the matcher-group's inner entry matching the exact command; drop the whole group if
	// that empties it, and the whole event key if that empties too.
	const filtered = groups
		.map((group) => ({ ...group, hooks: group.hooks.filter((h) => h.command !== command) }))
		.filter((group) => group.hooks.length > 0);

	if (filtered.length > 0) {
		hooksByEvent[event] = filtered;
	} else {
		delete hooksByEvent[event];
	}
	settings.hooks = hooksByEvent;
	await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}

/**
 * Prunes an ai-rules-managed hook that has dropped out of the fetched catalog: removes its exact
 * command entry from `.claude/settings.json` (never touching a hand-written entry, since it's
 * matched by the sidecar's own recorded command string), deletes its `.claude/hooks/<name>/` script
 * directory, and removes it from the sidecar. No-ops gracefully when settings.json/the sidecar are
 * already absent.
 * @param targetDir - Absolute path to the project directory
 * @param hookName - The hook's catalog name (the sidecar's join key)
 * @param entry - The sidecar's recorded event/command/scriptPath for this hook
 */
export async function pruneManagedHook(targetDir: string, hookName: string, entry: ManagedHookEntry): Promise<void> {
	await removeHookFromSettings(targetDir, entry.event, entry.command);

	const scriptDir = dirname(resolveWithinDir(targetDir, entry.scriptPath));
	await rm(scriptDir, { recursive: true, force: true });

	const sidecarPath = resolveWithinDir(targetDir, ".claude/.ai-rules-managed.json");
	const sidecar = await readJsonFileFailClosed<ManagedHooksSidecar>(
		sidecarPath,
		{ version: 1, managedHooks: {} },
		"managed hooks sidecar",
	);
	delete sidecar.managedHooks[hookName];
	await writeFile(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`, "utf-8");
}
