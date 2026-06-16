import { join } from "node:path";
import chalk from "chalk";
import type { KbMemory } from "../lib/api-client";
import { fetchKbMemories, fetchManifests, fetchRuleFile, fetchSkills, fetchWorkflows } from "../lib/api-client";
import { loadConfig } from "../lib/config";
import { applyNamingConvention, applySkillNamingConvention, writeRuleFile } from "../lib/files";
import { AIAgent, type OverwriteStrategy } from "../lib/types";

interface PullOptions {
	overwriteStrategy?: OverwriteStrategy;
}

/** Header prepended to the managed kb-memory.md file, warning developers not to hand-edit it. */
const KB_MEMORY_MANAGED_HEADER = "<!-- DO NOT EDIT — managed by ai-rules pull. Overwritten on next pull. -->";

/**
 * Renders the managed memory file content from the fetched canonical memories. Begins with the
 * managed header, then a heading, then each memory as a titled section. Deterministic output makes
 * the overwrite idempotent.
 * @param memories - The canonical memories to render
 * @returns The full file content for .claude/rules/kb-memory.md
 */
function renderMemoryFile(memories: KbMemory[]): string {
	const sections = memories.map((m) => `## ${m.title}\n\n${m.body}`).join("\n\n");
	const body = sections.length > 0 ? `\n\n${sections}\n` : "\n";
	return `${KB_MEMORY_MANAGED_HEADER}\n# Knowledge Base Memories${body}`;
}

/**
 * Materializes the workspace's canonical KB memories into a single managed file at
 * `.claude/rules/kb-memory.md`. Skipped entirely when the agent is not claude-code or when no scope
 * is configured. Failure to fetch is isolated: it logs a warning and does NOT abort the pull.
 * @param agent - The configured AI agent
 * @param scope - The workspace's declared scope tags (may be undefined/empty)
 */
async function materializeMemories(agent: string, scope: string[] | undefined): Promise<void> {
	// Guard: memories are claude-code only for now, and require a scope to fetch anything.
	if (agent !== AIAgent.CLAUDE_CODE) return;
	if (!scope || scope.length === 0) return;

	try {
		const memories = await fetchKbMemories(scope);
		const targetPath = applyNamingConvention(AIAgent.CLAUDE_CODE, "kb-memory.md");
		await writeRuleFile(renderMemoryFile(memories), join(process.cwd(), targetPath));
		console.log(chalk.green(`\n🧠 Materialized ${memories.length} knowledge-base memories → ${targetPath}`));
	} catch (error) {
		// Failure isolation: a memory-fetch failure must never abort the rest of the pull.
		const message = error instanceof Error ? error.message : "Unknown error";
		console.warn(chalk.yellow(`⚠️  Skipped knowledge-base memories: ${message}`));
	}
}

/**
 * Pull and re-install all rules, skills, and workflows from .ai-rules.json config
 */
export async function pullCommand(_options: PullOptions = {}): Promise<void> {
	console.log(chalk.blue("🔄 Pulling latest AI rules...\n"));

	const config = await loadConfig(process.cwd());
	const { agent, categories, skills, workflows, scope } = config;

	const hasCategories = categories && categories.length > 0;
	const hasSkills = skills && skills.length > 0;
	const hasWorkflows = workflows && workflows.length > 0;

	if (!hasCategories && !hasSkills && !hasWorkflows) {
		console.log(chalk.yellow("⚠️  Nothing configured to pull."));
		// Even with nothing else configured, a claude-code workspace with a scope still gets its
		// always-on knowledge-base memories materialized.
		await materializeMemories(agent, scope);
		return;
	}

	let totalInstalled = 0;

	// Re-install rules from categories
	if (hasCategories) {
		console.log(chalk.blue(`📦 Pulling ${categories.length} rule categories...`));
		const manifests = await fetchManifests(agent, scope);

		for (const categoryId of categories) {
			const manifest = manifests.find((m) => m.id === categoryId);
			if (!manifest) {
				console.error(chalk.red(`  ❌ Category not found: ${categoryId}`));
				continue;
			}

			for (const file of manifest.files) {
				const content = await fetchRuleFile(agent, manifest.category, file.path, scope);
				if (!content) {
					console.error(chalk.red(`  ❌ Failed to fetch: ${file.path}`));
					continue;
				}

				const filename = file.path.split("/").pop() || file.path;
				const targetPath = applyNamingConvention(agent as AIAgent, filename);
				await writeRuleFile(content, join(process.cwd(), targetPath));
				console.log(chalk.green(`  ✓ ${targetPath}`));
				totalInstalled++;
			}
		}
	}

	// Re-install skills
	if (hasSkills) {
		console.log(chalk.blue(`\n🎯 Pulling ${skills.length} skills...`));
		const allSkills = await fetchSkills(agent, scope);

		for (const skillName of skills) {
			const skill = allSkills.find((s) => s.name === skillName);
			if (!skill) {
				console.error(chalk.red(`  ❌ Skill not found: ${skillName}`));
				continue;
			}

			const targetPath = applySkillNamingConvention(agent as AIAgent, skill.name);
			await writeRuleFile(skill.content, join(process.cwd(), targetPath));
			console.log(chalk.green(`  ✓ ${targetPath}`));
			totalInstalled++;
		}
	}

	// Re-install workflows
	if (hasWorkflows) {
		console.log(chalk.blue(`\n📋 Pulling ${workflows.length} workflows...`));
		const allWorkflows = await fetchWorkflows(agent, scope);

		for (const workflowName of workflows) {
			const workflow = allWorkflows.find((w) => w.name === workflowName);
			if (!workflow) {
				console.error(chalk.red(`  ❌ Workflow not found: ${workflowName}`));
				continue;
			}

			const targetPath = `.agents/workflows/${workflow.name}.md`;
			await writeRuleFile(workflow.content, join(process.cwd(), targetPath));
			console.log(chalk.green(`  ✓ ${targetPath}`));
			totalInstalled++;
		}
	}

	// Materialize the workspace's always-on knowledge-base memories (claude-code + scope only).
	await materializeMemories(agent, scope);

	console.log(chalk.green(`\n🎉 Successfully pulled ${totalInstalled} items`));
}
