import { join } from "node:path";
import chalk from "chalk";
import { fetchAvailableAgents, fetchManifests, fetchRuleFile, fetchSkills, fetchWorkflows } from "../lib/api-client";
import { addCategory, addSkill, addWorkflow, loadConfig, saveConfig } from "../lib/config";
import { applyNamingConvention, applySkillNamingConvention, detectConflict, writeRuleFile } from "../lib/files";
import {
	promptAgentSelection,
	promptCategorySelection,
	promptConflictResolution,
	promptSkillSelection,
	promptWorkflowSelection,
} from "../lib/prompts";
import type { AIAgent, Config, InitOptions, OverwriteStrategy } from "../lib/types";

/**
 * Installs selected skills for the given agent
 */
async function installSkills(
	skills: Array<{ name: string; content: string }>,
	agent: string,
	overwriteStrategy: OverwriteStrategy,
	config: Config,
): Promise<void> {
	let installedSkillsCount = 0;

	for (const skill of skills) {
		try {
			// Apply skill naming convention for this agent
			const targetPath = applySkillNamingConvention(agent as AIAgent, skill.name);

			// Check for conflicts
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

			// Write skill file
			await writeRuleFile(skill.content, join(process.cwd(), targetPath));
			console.log(chalk.green(`✓ Installed skill: ${skill.name}`));
			installedSkillsCount++;

			// Add skill to config
			const updatedConfig = addSkill(config, skill.name);
			Object.assign(config, updatedConfig);
		} catch (error) {
			console.error(chalk.red(`❌ Error installing skill ${skill.name}: ${error}`));
		}
	}

	console.log(chalk.green(`\n🎉 Successfully installed ${installedSkillsCount} skills`));
}

/**
 * Installs selected workflows for the given agent
 */
async function installWorkflows(
	workflows: Array<{ name: string; content: string }>,
	_agent: string,
	overwriteStrategy: OverwriteStrategy,
	config: Config,
): Promise<void> {
	let installedWorkflowsCount = 0;

	for (const workflow of workflows) {
		try {
			// Workflows go to .agent/workflows/<name>.md
			const targetPath = `.agent/workflows/${workflow.name}.md`;

			// Check for conflicts
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

			// Write workflow file
			await writeRuleFile(workflow.content, join(process.cwd(), targetPath));
			console.log(chalk.green(`✓ Installed workflow: ${workflow.name}`));
			installedWorkflowsCount++;

			// Add workflow to config
			const updatedConfig = addWorkflow(config, workflow.name);
			Object.assign(config, updatedConfig);
		} catch (error) {
			console.error(chalk.red(`❌ Error installing workflow ${workflow.name}: ${error}`));
		}
	}

	console.log(chalk.green(`\n🎉 Successfully installed ${installedWorkflowsCount} workflows`));
}

/**
 * Initialize AI rules for the current project
 * @param options - CLI options for non-interactive mode
 */
export async function initCommand(options: InitOptions = {}): Promise<void> {
	try {
		console.log(chalk.blue("🚀 Initializing AI Rules...\n"));

		// Fetch available agents
		const agents = await fetchAvailableAgents();
		if (agents.length === 0) {
			console.error(chalk.red("❌ No AI agents found. Make sure the API server is running."));
			process.exit(1);
		}

		// Agent selection: use provided option or prompt
		let selectedAgent: string;
		if (options.agent) {
			// Validate provided agent
			if (!agents.includes(options.agent)) {
				console.error(chalk.red(`❌ Invalid agent: ${options.agent}`));
				console.log(chalk.yellow(`Available agents: ${agents.join(", ")}`));
				process.exit(1);
			}
			selectedAgent = options.agent;
			console.log(chalk.green(`✓ Selected agent: ${selectedAgent}\n`));
		} else {
			selectedAgent = await promptAgentSelection(agents);
			console.log(chalk.green(`✓ Selected agent: ${selectedAgent}\n`));
		}

		// Category selection: skip if --no-categories, else use provided options or prompt
		let selectedCategories: string[] = [];
		let manifests: Awaited<ReturnType<typeof fetchManifests>> = [];
		if (options.noCategories) {
			console.log(chalk.yellow("⏭️  Skipping categories (--no-categories)\n"));
		} else {
			// Fetch manifests for selected agent
			manifests = await fetchManifests(selectedAgent);
			if (manifests.length === 0) {
				console.error(chalk.red("❌ No rule categories found for this agent"));
				return;
			}

			if (options.categories && options.categories.length > 0) {
				// Check if "all" is specified
				if (options.categories.includes("all")) {
					selectedCategories = manifests.map((m) => m.id);
					console.log(chalk.green(`✓ Selected all categories: ${selectedCategories.join(", ")}\n`));
				} else {
					// Validate provided categories
					const validCategories = manifests.map((m) => m.id);
					const invalidCategories = options.categories.filter((cat) => !validCategories.includes(cat));
					if (invalidCategories.length > 0) {
						console.error(chalk.red(`❌ Invalid categories: ${invalidCategories.join(", ")}`));
						console.log(chalk.yellow(`Available categories: ${validCategories.join(", ")}`));
						process.exit(1);
					}
					selectedCategories = options.categories;
					console.log(chalk.green(`✓ Selected categories: ${selectedCategories.join(", ")}\n`));
				}
			} else {
				selectedCategories = await promptCategorySelection(manifests);
				if (selectedCategories.length === 0) {
					console.log(chalk.yellow("⚠️  No categories selected.\n"));
				}
				if (selectedCategories.length > 0) {
					console.log(chalk.green(`✓ Selected categories: ${selectedCategories.join(", ")}\n`));
				}
			}
		}

		// Load existing config or create default
		let config: Config;
		try {
			config = await loadConfig(process.cwd());
		} catch (_error) {
			// Config file doesn't exist, create default config
			console.log("No existing config found, creating new configuration...");
			config = {
				version: "1.0.0",
				agent: selectedAgent,
				categories: [],
			};
		}

		// Always update agent to match the selected agent
		config = { ...config, agent: selectedAgent };

		// Determine overwrite strategy
		const overwriteStrategy = options.overwriteStrategy || "prompt";

		// Process each selected category
		const installedRules: string[] = [];

		for (const categoryId of selectedCategories) {
			const manifest = manifests.find((m) => m.id === categoryId);
			if (!manifest) {
				console.error(chalk.red(`❌ Manifest not found for category: ${categoryId}`));
				continue;
			}

			console.log(chalk.blue(`📦 Installing ${manifest.id}...`));

			// Process each file in the manifest
			for (const file of manifest.files) {
				try {
					// Fetch file content
					const content = await fetchRuleFile(selectedAgent, manifest.category, file.path);
					if (!content) {
						console.error(chalk.red(`❌ Failed to fetch file: ${file.path}`));
						continue;
					}

					// Extract filename from path (last segment)
					const filename = file.path.split("/").pop() || file.path;

					// Apply naming convention
					const targetPath = applyNamingConvention(selectedAgent as AIAgent, filename);

					// Check for conflicts
					const conflict = await detectConflict(join(process.cwd(), targetPath));
					if (conflict.hasConflict) {
						// Handle conflict based on strategy
						if (overwriteStrategy === "skip") {
							console.log(chalk.yellow(`⏭️  Skipped (file exists): ${targetPath}`));
							continue;
						}

						if (overwriteStrategy === "force") {
							console.log(chalk.yellow(`⚠️  Overwriting: ${targetPath}`));
						} else {
							// prompt strategy
							const shouldOverwrite = await promptConflictResolution(targetPath);
							if (!shouldOverwrite) {
								console.log(chalk.yellow(`⏭️  Skipped: ${targetPath}`));
								continue;
							}
						}
					}

					// Write file
					await writeRuleFile(content, join(process.cwd(), targetPath));
					console.log(chalk.green(`✓ Installed: ${targetPath}`));
				} catch (error) {
					console.error(chalk.red(`❌ Error processing ${file.path}: ${error}`));
				}
			}

			// Add category to config
			const updatedConfig = addCategory(config, categoryId);
			Object.assign(config, updatedConfig);

			installedRules.push(manifest.id);
		}

		// Install skills: skip if --no-skills, else use CLI flag or interactive prompt
		if (options.noSkills) {
			console.log(chalk.yellow("\n⏭️  Skipping skills (--no-skills)"));
		} else if (options.skills && options.skills.length > 0) {
			// CLI flag provided: install named skills
			console.log(chalk.blue("\n🎯 Checking for available skills..."));
			const skills = await fetchSkills(selectedAgent);

			// Filter to only selected skills
			const selectedSkills = skills.filter((skill) => options.skills?.includes(skill.name));

			// Check for non-existent skills and warn
			const availableSkillNames = skills.map((s) => s.name);
			const requestedSkillNames = options.skills;
			const notFoundSkills = requestedSkillNames.filter((name) => !availableSkillNames.includes(name));

			if (notFoundSkills.length > 0) {
				console.error(
					chalk.red(
						`\n❌ Error: The following skills were not found and will be skipped: ${notFoundSkills.join(", ")}`,
					),
				);
			}

			if (selectedSkills.length > 0) {
				await installSkills(selectedSkills, selectedAgent, overwriteStrategy, config);
			} else {
				console.log(chalk.yellow("No matching skills found"));
			}
		} else if (process.stdin.isTTY) {
			// Interactive mode: fetch and prompt (only when TTY is available)
			const skills = await fetchSkills(selectedAgent);
			if (skills.length > 0) {
				console.log(chalk.blue("\n🎯 Skills available for this agent:"));
				const selectedSkillNames = await promptSkillSelection(skills);
				if (selectedSkillNames.length > 0) {
					const selectedSkills = skills.filter((s) => selectedSkillNames.includes(s.name));
					await installSkills(selectedSkills, selectedAgent, overwriteStrategy, config);
				} else {
					console.log(chalk.yellow("No skills selected."));
				}
			}
		}

		// Install workflows: skip if --no-workflows, else use CLI flag or interactive prompt
		if (options.noWorkflows) {
			console.log(chalk.yellow("\n⏭️  Skipping workflows (--no-workflows)"));
		} else if (options.workflows && options.workflows.length > 0) {
			// CLI flag provided: install named workflows
			console.log(chalk.blue("\n🎯 Installing workflows..."));
			const allWorkflows = await fetchWorkflows(selectedAgent);

			// Filter to only selected workflows
			const selectedWorkflows = allWorkflows.filter((w) => options.workflows?.includes(w.name));

			if (selectedWorkflows.length > 0) {
				await installWorkflows(selectedWorkflows, selectedAgent, overwriteStrategy, config);
			} else {
				console.log(chalk.yellow("No matching workflows found"));
			}
		} else if (process.stdin.isTTY) {
			// Interactive mode: fetch and prompt (only when TTY is available)
			const allWorkflows = await fetchWorkflows(selectedAgent);
			if (allWorkflows.length > 0) {
				console.log(chalk.blue("\n⚡ Workflows available for this agent:"));
				const selectedWorkflowNames = await promptWorkflowSelection(allWorkflows);
				if (selectedWorkflowNames.length > 0) {
					const selectedWorkflows = allWorkflows.filter((w) => selectedWorkflowNames.includes(w.name));
					await installWorkflows(selectedWorkflows, selectedAgent, overwriteStrategy, config);
				} else {
					console.log(chalk.yellow("No workflows selected."));
				}
			}
		}

		// Save updated config
		await saveConfig(process.cwd(), config);

		// Display success message
		console.log(chalk.green(`\n🎉 Successfully installed ${installedRules.length} rule categories:`));
		installedRules.forEach((rule) => {
			console.log(chalk.green(`  • ${rule}`));
		});

		console.log(chalk.blue(`\n📝 Configuration saved to .ai-rules.json`));
	} catch (error) {
		console.error(chalk.red(`❌ Error during initialization: ${error}`));
		process.exit(1);
	}
}
