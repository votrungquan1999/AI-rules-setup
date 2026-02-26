import { join } from "node:path";
import chalk from "chalk";
import { fetchManifests, fetchRuleFile, fetchSkills, fetchWorkflows } from "../lib/api-client";
import { loadConfig } from "../lib/config";
import { applyNamingConvention, applySkillNamingConvention, writeRuleFile } from "../lib/files";
import type { AIAgent, OverwriteStrategy } from "../lib/types";

interface PullOptions {
	overwriteStrategy?: OverwriteStrategy;
}

/**
 * Pull and re-install all rules, skills, and workflows from .ai-rules.json config
 */
export async function pullCommand(_options: PullOptions = {}): Promise<void> {
	console.log(chalk.blue("🔄 Pulling latest AI rules...\n"));

	const config = await loadConfig(process.cwd());
	const { agent, categories, skills, workflows } = config;

	const hasCategories = categories && categories.length > 0;
	const hasSkills = skills && skills.length > 0;
	const hasWorkflows = workflows && workflows.length > 0;

	if (!hasCategories && !hasSkills && !hasWorkflows) {
		console.log(chalk.yellow("⚠️  Nothing configured to pull."));
		return;
	}

	let totalInstalled = 0;

	// Re-install rules from categories
	if (hasCategories) {
		console.log(chalk.blue(`📦 Pulling ${categories.length} rule categories...`));
		const manifests = await fetchManifests(agent);

		for (const categoryId of categories) {
			const manifest = manifests.find((m) => m.id === categoryId);
			if (!manifest) {
				console.error(chalk.red(`  ❌ Category not found: ${categoryId}`));
				continue;
			}

			for (const file of manifest.files) {
				const content = await fetchRuleFile(agent, manifest.category, file.path);
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
		const allSkills = await fetchSkills(agent);

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
		const allWorkflows = await fetchWorkflows(agent);

		for (const workflowName of workflows) {
			const workflow = allWorkflows.find((w) => w.name === workflowName);
			if (!workflow) {
				console.error(chalk.red(`  ❌ Workflow not found: ${workflowName}`));
				continue;
			}

			const targetPath = `.agent/workflows/${workflow.name}.md`;
			await writeRuleFile(workflow.content, join(process.cwd(), targetPath));
			console.log(chalk.green(`  ✓ ${targetPath}`));
			totalInstalled++;
		}
	}

	console.log(chalk.green(`\n🎉 Successfully pulled ${totalInstalled} items`));
}
