import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import chalk from "chalk";
import type { KbMemory } from "../lib/api-client";
import { fetchKbMemories, fetchManifests, fetchRuleFile, fetchSkills, fetchWorkflows } from "../lib/api-client";
import { readConfigOrNull, saveConfig } from "../lib/config";
import { discoverConfigDirs } from "../lib/discover";
import {
	applyNamingConvention,
	applySkillFileNamingConvention,
	applySkillNamingConvention,
	writeRuleFile,
} from "../lib/files";
import { AIAgent, type Config } from "../lib/types";

/**
 * Agents whose skills can be materialized on disk. `applySkillNamingConvention` throws for any
 * other agent, so skill install is guarded to this set.
 */
const SKILL_AGENTS = new Set<string>([AIAgent.CURSOR, AIAgent.CLAUDE_CODE, AIAgent.ANTIGRAVITY]);

/**
 * Resolves `targetPath` under `targetDir` and guarantees the result stays inside `targetDir`.
 * Catalog-controlled names (skill name, supporting-file path, workflow name) flow into write
 * paths, so a poisoned `../`-bearing value could otherwise escape the project. Throws on escape.
 * @param targetDir - Absolute path to the project directory
 * @param targetPath - Project-relative path derived from catalog data
 * @returns The absolute write path, guaranteed to be within `targetDir`
 */
function resolveWithinDir(targetDir: string, targetPath: string): string {
	const base = resolve(targetDir);
	const full = resolve(base, targetPath);
	if (full !== base && !full.startsWith(base + sep)) {
		throw new Error(`Refusing to write outside the project directory: ${targetPath}`);
	}
	return full;
}

/** Module-level guard so the missing-secret warning fires at most once per process. */
let secretWarned = false;

/**
 * Resets the missing-secret warning guard. Used by tests so the warn-once state does not leak
 * across cases in the same process.
 */
export function resetSecretWarned(): void {
	secretWarned = false;
}

/**
 * Warns once (per process) that `AI_RULES_SECRET` is unset, so private/scoped skills and
 * knowledge-base memories will be skipped. A no-op when the secret is present or already warned.
 */
export function warnIfSecretMissing(): void {
	if (secretWarned) return;
	if (process.env.AI_RULES_SECRET) return;
	secretWarned = true;
	console.warn(
		chalk.yellow("⚠️  AI_RULES_SECRET is not set — private/scoped skills and knowledge-base memories will be skipped."),
	);
}

/** Header prepended to the managed kb-memory.md file, warning developers not to hand-edit it. */
const KB_MEMORY_MANAGED_HEADER = "<!-- DO NOT EDIT — managed by ai-rules sync. Overwritten on next sync. -->";

/**
 * Renders the managed memory file content from the fetched canonical memories. Deterministic output
 * makes the overwrite idempotent.
 * @param memories - The canonical memories to render
 * @returns The full file content for .claude/rules/kb-memory.md
 */
function renderMemoryFile(memories: KbMemory[]): string {
	const sections = memories.map((m) => `## ${m.title}\n\n${m.body}`).join("\n\n");
	const body = sections.length > 0 ? `\n\n${sections}\n` : "\n";
	return `${KB_MEMORY_MANAGED_HEADER}\n# Knowledge Base Memories${body}`;
}

/**
 * Materializes the project's canonical KB memories into `.claude/rules/kb-memory.md` under
 * `targetDir`. Skipped when the agent is not claude-code or when no scope is configured. A fetch
 * failure is isolated: it logs a warning and does NOT abort the sync.
 * @param agent - The configured AI agent
 * @param scope - The project's declared scope tags (may be undefined/empty)
 * @param targetDir - Absolute path to the project directory
 */
async function materializeMemories(agent: string, scope: string[] | undefined, targetDir: string): Promise<void> {
	if (agent !== AIAgent.CLAUDE_CODE) return;
	if (!scope || scope.length === 0) return;

	try {
		const memories = await fetchKbMemories(scope);
		const targetPath = applyNamingConvention(AIAgent.CLAUDE_CODE, "kb-memory.md");
		await writeRuleFile(renderMemoryFile(memories), join(targetDir, targetPath));
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.warn(chalk.yellow(`⚠️  Skipped knowledge-base memories: ${message}`));
	}
}

/**
 * Result of syncing a single project.
 */
export interface SyncResult {
	/** Number of files installed (rules + skills + workflows). */
	installed: number;
}

/**
 * Summary of a bulk sync across many projects.
 */
export interface BulkSyncSummary {
	/** Number of projects that synced without error. */
	succeeded: number;
	/** Number of projects that threw and were skipped. */
	failed: number;
}

/**
 * Options for the `sync` command entry.
 */
export interface SyncCommandOptions {
	/** When true, discover and sync every project under `root` instead of just the cwd. */
	all?: boolean;
	/** Root directory to scan in `--all` mode. Defaults to ~/Documents/git-repos. */
	root?: string;
}

/**
 * Discovers every AI-rules project under `root` and full-catalog syncs each, isolating per-project
 * failures so one broken project never aborts the rest.
 * @param root - Absolute path to the directory to scan for projects
 * @returns Counts of succeeded and failed projects
 */
export async function runBulkSync(root: string): Promise<BulkSyncSummary> {
	const projectDirs = await discoverConfigDirs(root);

	if (projectDirs.length === 0) {
		console.log(chalk.yellow(`⚠️  No AI-rules projects found under ${root}`));
		return { succeeded: 0, failed: 0 };
	}

	console.log(chalk.blue(`🔄 Syncing ${projectDirs.length} project(s) under ${root}...\n`));

	let succeeded = 0;
	let failed = 0;

	for (const projectDir of projectDirs) {
		// Per-project boundary: one broken project must never abort the whole run.
		try {
			await syncOneProject(projectDir);
			console.log(chalk.green(`  ✓ ${projectDir}`));
			succeeded++;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(chalk.red(`  ❌ Failed to sync ${projectDir}: ${message}`));
			failed++;
		}
	}

	console.log(chalk.green(`\n🎉 Sync complete: ${succeeded} succeeded, ${failed} failed`));

	return { succeeded, failed };
}

/**
 * Entry point for the `sync` command. Warns once if the secret is missing, then either bulk-syncs
 * every project under `root` (when `--all`) or full-catalog syncs the current directory.
 * @param options - Command options (`all`, `root`)
 * @returns The bulk summary in `--all` mode, otherwise undefined
 */
export async function syncCommand(options: SyncCommandOptions = {}): Promise<BulkSyncSummary | undefined> {
	warnIfSecretMissing();

	if (options.all) {
		const root = options.root || join(homedir(), "Documents", "git-repos");
		return runBulkSync(root);
	}

	await syncOneProject(process.cwd());
	return undefined;
}

/**
 * Installs the full available catalog (all categories, skills, workflows for the project's
 * agent + scope) into a single project directory, force-overwriting existing files.
 * @param targetDir - Absolute path to the project directory to sync
 * @returns A summary of what was installed
 */
export async function syncOneProject(targetDir: string): Promise<SyncResult> {
	const config = await readConfigOrNull(targetDir);
	if (!config) return { installed: 0 };

	const { agent, scope } = config;
	const installedCategories: string[] = [];
	const installedSkills: string[] = [];
	const installedWorkflows: string[] = [];

	// Rules: install every file of every available category.
	const manifests = await fetchManifests(agent, scope);
	for (const manifest of manifests) {
		let wroteAnyFile = false;
		for (const file of manifest.files) {
			const content = await fetchRuleFile(agent, manifest.category, file.path, scope);
			if (!content) continue;
			const filename = file.path.split("/").pop() || file.path;
			const targetPath = applyNamingConvention(agent as AIAgent, filename);
			await writeRuleFile(content, resolveWithinDir(targetDir, targetPath));
			wroteAnyFile = true;
		}
		// Only record the category as installed if a file actually landed — otherwise the
		// rewritten config would assert a category that isn't on disk.
		if (wroteAnyFile) installedCategories.push(manifest.id);
	}

	// Skills: install every available skill plus its supporting files. Guarded to agents that have
	// a skill convention — others (e.g. windsurf) get no skills foisted on them.
	const supportsSkills = SKILL_AGENTS.has(agent);
	if (supportsSkills) {
		const skills = await fetchSkills(agent, scope);
		for (const skill of skills) {
			const targetPath = applySkillNamingConvention(agent as AIAgent, skill.name);
			await writeRuleFile(skill.content, resolveWithinDir(targetDir, targetPath));
			for (const supportingFile of skill.supportingFiles ?? []) {
				const supportingPath = applySkillFileNamingConvention(agent as AIAgent, skill.name, supportingFile.path);
				await writeRuleFile(supportingFile.content, resolveWithinDir(targetDir, supportingPath));
			}
			installedSkills.push(skill.name);
		}
	}

	// Workflows: install every available workflow.
	const workflows = await fetchWorkflows(agent, scope);
	for (const workflow of workflows) {
		await writeRuleFile(workflow.content, resolveWithinDir(targetDir, `.agents/workflows/${workflow.name}.md`));
		installedWorkflows.push(workflow.name);
	}

	// Rewrite the config to exactly the installed set, preserving version/agent/scope. The skills
	// key is omitted entirely for agents without a skill convention.
	const newConfig: Config = {
		version: config.version,
		agent: config.agent,
		categories: installedCategories,
		workflows: installedWorkflows,
	};
	if (supportsSkills) newConfig.skills = installedSkills;
	if (scope) newConfig.scope = scope;
	await saveConfig(targetDir, newConfig);

	// Materialize always-on KB memories (claude-code + scope only); failure is isolated.
	await materializeMemories(agent, scope, targetDir);

	return { installed: installedCategories.length + installedSkills.length + installedWorkflows.length };
}
