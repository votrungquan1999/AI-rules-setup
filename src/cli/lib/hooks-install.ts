import { fetchHooks } from "./api-client";
import { addHook } from "./config";
import {
	applyHookNamingConvention,
	type HookSettingsFragment,
	mergeSettingsJson,
	readManagedHooks,
	recordManagedHook,
	removeHookFromSettings,
	resolveWithinDir,
	writeRuleFile,
} from "./files";
import { AIAgent, type Config } from "./types";

/** Shape of a hook's `hook.json` entry content, parsed from `HookFile.content`. */
interface HookManifest {
	description?: string;
	event: string;
	script: string;
	settingsFragment: HookSettingsFragment;
}

/**
 * Result of installing a set of hooks.
 */
export interface InstallHooksResult {
	/** Config updated with the newly-installed hooks recorded. */
	config: Config;
	/** Names of hooks actually installed (present in the catalog and matched). */
	installed: string[];
}

/**
 * Installs the given hooks by name into `targetDir`: writes the script (and any other supporting
 * files) under `.claude/hooks/<name>/`, merges the hook's settings fragment into
 * `.claude/settings.json`, records it as ai-rules-managed in the sidecar, and appends it to
 * `config.hooks`. Shared by init/add/pull/sync so the install logic lives in exactly one place.
 * @param hookNames - Names of hooks to install (matched against the fetched catalog)
 * @param agent - The configured AI agent (hooks are claude-code only for now)
 * @param scope - Project scope tags forwarded to `fetchHooks`
 * @param config - Current config; returned with `hooks` updated
 * @param targetDir - Absolute path to the project directory
 * @returns The updated config and the list of hook names actually installed
 */
export async function installHooks(
	hookNames: string[],
	agent: string,
	scope: string[] | undefined,
	config: Config,
	targetDir: string,
): Promise<InstallHooksResult> {
	// Hooks are claude-code only for now — mirrors SKILL_AGENTS' precedent in sync.ts.
	if (agent !== AIAgent.CLAUDE_CODE || hookNames.length === 0) {
		return { config, installed: [] };
	}

	const catalog = await fetchHooks(agent, scope);
	// Snapshot of what was managed BEFORE this run, to reconcile a hook whose command changed.
	const priorManaged = await readManagedHooks(targetDir);
	let nextConfig = config;
	const installed: string[] = [];

	for (const hookName of hookNames) {
		const hook = catalog.find((h) => h.name === hookName);
		if (!hook) continue;

		const manifest = JSON.parse(hook.content) as HookManifest;
		const scriptPath = applyHookNamingConvention(agent as AIAgent, hook.name, manifest.script);

		for (const supportingFile of hook.supportingFiles ?? []) {
			const targetPath = applyHookNamingConvention(agent as AIAgent, hook.name, supportingFile.path);
			await writeRuleFile(supportingFile.content, resolveWithinDir(targetDir, targetPath));
		}

		const command = firstCommand(manifest.settingsFragment, manifest.event);

		// If this hook was previously installed under a different command, clear the stale
		// registration first — otherwise the new command is appended alongside the old one.
		const prior = priorManaged[hook.name];
		if (prior && command && prior.command !== command) {
			await removeHookFromSettings(targetDir, prior.event, prior.command);
		}

		await mergeSettingsJson(targetDir, manifest.settingsFragment);

		if (command) {
			await recordManagedHook(targetDir, hook.name, { event: manifest.event, command, scriptPath });
		}

		nextConfig = addHook(nextConfig, hook.name);
		installed.push(hook.name);
	}

	return { config: nextConfig, installed };
}

/**
 * Reads the first registered command out of a hook's settings fragment for the given event.
 * The fragment always carries exactly one matcher-group with one command (Track 1's schema) —
 * this is what the sidecar's prune-by-command-match (Step 10) keys off.
 * @param fragment - The hook's settings fragment
 * @param event - The event key to read (e.g. `UserPromptSubmit`)
 * @returns The command string, or undefined if the fragment has none for that event
 */
function firstCommand(fragment: HookSettingsFragment, event: string): string | undefined {
	const groups = fragment.hooks[event] as Array<{ hooks: Array<{ command: string }> }> | undefined;
	return groups?.[0]?.hooks?.[0]?.command;
}
