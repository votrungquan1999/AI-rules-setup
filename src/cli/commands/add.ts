import { existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { fetchManifests, fetchRuleFile, fetchSkills, fetchWorkflows } from "../lib/api-client";
import { addCategory, addSkill, addWorkflow, loadConfig, saveConfig } from "../lib/config";
import {
	applyNamingConvention,
	applySkillFileNamingConvention,
	applySkillNamingConvention,
	detectConflict,
	writeRuleFile,
} from "../lib/files";
import { promptConflictResolution } from "../lib/prompts";
import type { AddOptions, AIAgent, Config, OverwriteStrategy } from "../lib/types";

/**
 * Add categories, skills, or workflows to an existing project.
 * Reads the agent from the existing .ai-rules.json config.
 */
export async function addCommand(options: AddOptions): Promise<void> {
	const hasContent = options.categories || options.skills || options.workflows;
	if (!hasContent) {
		console.error(chalk.red("❌ Please specify at least one of --categories, --skills, or --workflows"));
		process.exit(1);
	}

	// Check that .ai-rules.json exists (add command requires prior init)
	const configPath = join(process.cwd(), ".ai-rules.json");
	if (!existsSync(configPath)) {
		console.error(chalk.red("❌ No .ai-rules.json found. Run 'ai-rules init' first to initialize your project."));
		process.exit(1);
	}

	const config = await loadConfig(process.cwd());

	const agent = config.agent;
	if (!agent) {
		console.error(chalk.red("❌ No agent configured in .ai-rules.json. Run 'ai-rules init' first."));
		process.exit(1);
	}

	console.log(chalk.blue(`📦 Adding content for agent: ${agent}\n`));

	const overwriteStrategy = options.overwriteStrategy || "prompt";

	if (options.categories && options.categories.length > 0) {
		await addCategories(options.categories, agent, overwriteStrategy, config);
	}

	if (options.skills && options.skills.length > 0) {
		await addSkillsToProject(options.skills, agent as AIAgent, overwriteStrategy, config);
	}

	if (options.workflows && options.workflows.length > 0) {
		await addWorkflowsToProject(options.workflows, overwriteStrategy, config);
	}

	// Save updated config
	await saveConfig(process.cwd(), config);
	console.log(chalk.blue(`\n📝 Configuration saved to .ai-rules.json`));
}

async function addCategories(
	categoryNames: string[],
	agent: string,
	overwriteStrategy: OverwriteStrategy,
	config: Config,
): Promise<void> {
	const manifests = await fetchManifests(agent);
	if (manifests.length === 0) {
		console.log(chalk.yellow("No rule categories found for this agent"));
		return;
	}

	// Resolve "all" keyword
	const targetCategories = categoryNames.includes("all") ? manifests.map((m) => m.id) : categoryNames;

	let installedCount = 0;

	for (const categoryId of targetCategories) {
		const manifest = manifests.find((m) => m.id === categoryId);
		if (!manifest) {
			console.error(chalk.red(`❌ Category not found: ${categoryId}`));
			continue;
		}

		for (const file of manifest.files) {
			const content = await fetchRuleFile(agent, manifest.category, file.path);
			if (!content) {
				console.error(chalk.red(`❌ Failed to fetch rule file: ${file.path}`));
				continue;
			}
			const targetPath = applyNamingConvention(agent as AIAgent, file.path);

			const conflict = await detectConflict(join(process.cwd(), targetPath));
			if (conflict.hasConflict) {
				if (overwriteStrategy === "skip") {
					console.log(chalk.yellow(`⏭️  Skipped (file exists): ${targetPath}`));
					continue;
				}
				if (overwriteStrategy === "force") {
					console.log(chalk.yellow(`⚠️  Overwriting: ${targetPath}`));
				} else {
					const shouldOverwrite = await promptConflictResolution(targetPath);
					if (!shouldOverwrite) {
						console.log(chalk.yellow(`⏭️  Skipped: ${targetPath}`));
						continue;
					}
				}
			}

			await writeRuleFile(content, join(process.cwd(), targetPath));
			console.log(chalk.green(`✓ Installed: ${targetPath}`));
		}

		const updatedConfig = addCategory(config, categoryId);
		Object.assign(config, updatedConfig);
		installedCount++;
	}

	console.log(chalk.green(`\n🎉 Successfully added ${installedCount} rule categories`));
}

async function addSkillsToProject(
	skillNames: string[],
	agent: AIAgent,
	overwriteStrategy: OverwriteStrategy,
	config: Config,
): Promise<void> {
	console.log(chalk.blue("\n🎯 Checking for available skills..."));
	const skills = await fetchSkills(agent);

	if (skills.length === 0) {
		console.log(chalk.yellow("No skills found for this agent"));
		return;
	}

	// Resolve "all" keyword
	const selectedSkills = skillNames.includes("all") ? skills : skills.filter((s) => skillNames.includes(s.name));

	let installedCount = 0;

	for (const skill of selectedSkills) {
		const targetPath = applySkillNamingConvention(agent, skill.name);

		const conflict = await detectConflict(join(process.cwd(), targetPath));
		if (conflict.hasConflict) {
			if (overwriteStrategy === "skip") {
				console.log(chalk.yellow(`⏭️  Skipped (file exists): ${targetPath}`));
				continue;
			}
			if (overwriteStrategy === "force") {
				console.log(chalk.yellow(`⚠️  Overwriting: ${targetPath}`));
			} else {
				const shouldOverwrite = await promptConflictResolution(targetPath);
				if (!shouldOverwrite) {
					console.log(chalk.yellow(`⏭️  Skipped: ${targetPath}`));
					continue;
				}
			}
		}

		await writeRuleFile(skill.content, join(process.cwd(), targetPath));

		// Write supporting files if present
		if (skill.supportingFiles && skill.supportingFiles.length > 0) {
			for (const supportingFile of skill.supportingFiles) {
				const supportingPath = applySkillFileNamingConvention(agent, skill.name, supportingFile.path);
				await writeRuleFile(supportingFile.content, join(process.cwd(), supportingPath));
			}
		}

		console.log(chalk.green(`✓ Installed skill: ${skill.name}`));

		const updatedConfig = addSkill(config, skill.name);
		Object.assign(config, updatedConfig);
		installedCount++;
	}

	console.log(chalk.green(`\n🎉 Successfully added ${installedCount} skills`));
}

async function addWorkflowsToProject(
	workflowNames: string[],
	overwriteStrategy: OverwriteStrategy,
	config: Config,
): Promise<void> {
	console.log(chalk.blue("\n🎯 Installing workflows..."));
	const allWorkflows = await fetchWorkflows(config.agent);

	if (allWorkflows.length === 0) {
		console.log(chalk.yellow("No workflows found for this agent"));
		return;
	}

	// Resolve "all" keyword
	const selectedWorkflows = workflowNames.includes("all")
		? allWorkflows
		: allWorkflows.filter((w) => workflowNames.includes(w.name));

	let installedCount = 0;

	for (const workflow of selectedWorkflows) {
		const targetPath = `.agents/workflows/${workflow.name}.md`;

		const conflict = await detectConflict(join(process.cwd(), targetPath));
		if (conflict.hasConflict) {
			if (overwriteStrategy === "skip") {
				console.log(chalk.yellow(`⏭️  Skipped (file exists): ${targetPath}`));
				continue;
			}
			if (overwriteStrategy === "force") {
				console.log(chalk.yellow(`⚠️  Overwriting: ${targetPath}`));
			} else {
				const shouldOverwrite = await promptConflictResolution(targetPath);
				if (!shouldOverwrite) {
					console.log(chalk.yellow(`⏭️  Skipped: ${targetPath}`));
					continue;
				}
			}
		}

		await writeRuleFile(workflow.content, join(process.cwd(), targetPath));
		console.log(chalk.green(`✓ Installed workflow: ${workflow.name}`));

		const updatedConfig = addWorkflow(config, workflow.name);
		Object.assign(config, updatedConfig);
		installedCount++;
	}

	console.log(chalk.green(`\n🎉 Successfully added ${installedCount} workflows`));
}
