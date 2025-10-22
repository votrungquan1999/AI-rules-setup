import { join } from "node:path";
import chalk from "chalk";
import { addCategory, loadConfig, saveConfig } from "../lib/config";
import { applyNamingConvention, detectConflict, writeRuleFile } from "../lib/files";
import { fetchAvailableAgents, fetchManifests, fetchRuleFile } from "../lib/github";
import { promptAgentSelection, promptCategorySelection, promptConflictResolution } from "../lib/prompts";
import type { AIAgent, Config } from "../lib/types";

/**
 * Initialize AI rules for the current project
 */
export async function initCommand(): Promise<void> {
	try {
		console.log(chalk.blue("🚀 Initializing AI Rules...\n"));

		// Fetch available agents
		const agents = await fetchAvailableAgents();
		if (agents.length === 0) {
			console.log(chalk.red("❌ No AI agents found. Make sure the API server is running."));
			process.exit(1);
		}

		// Prompt for agent selection
		const selectedAgent = await promptAgentSelection(agents);
		console.log(chalk.green(`✓ Selected agent: ${selectedAgent}\n`));

		// Fetch manifests for selected agent
		const manifests = await fetchManifests(selectedAgent);
		if (manifests.length === 0) {
			console.log(chalk.red("❌ No rule categories found for this agent"));
			return;
		}

		// Prompt for category selection
		const selectedCategories = await promptCategorySelection(manifests);
		if (selectedCategories.length === 0) {
			console.log(chalk.yellow("⚠️  No categories selected. Nothing to install."));
			return;
		}

		console.log(chalk.green(`✓ Selected categories: ${selectedCategories.join(", ")}\n`));

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

		// Process each selected category
		const installedRules: string[] = [];

		for (const categoryId of selectedCategories) {
			const manifest = manifests.find((m) => m.id === categoryId);
			if (!manifest) {
				console.log(chalk.red(`❌ Manifest not found for category: ${categoryId}`));
				continue;
			}

			console.log(chalk.blue(`📦 Installing ${manifest.id}...`));

			// Process each file in the manifest
			for (const file of manifest.files) {
				try {
					// Fetch file content
					const content = await fetchRuleFile(selectedAgent, manifest.category, file.path);
					if (!content) {
						console.log(chalk.red(`❌ Failed to fetch file: ${file.path}`));
						continue;
					}

					// Extract filename from path (last segment)
					const filename = file.path.split("/").pop() || file.path;

					// Apply naming convention
					const targetPath = applyNamingConvention(selectedAgent as AIAgent, filename);

					// Check for conflicts
					const conflict = await detectConflict(join(process.cwd(), targetPath));
					if (conflict.hasConflict) {
						const shouldOverwrite = await promptConflictResolution(targetPath);
						if (!shouldOverwrite) {
							console.log(chalk.yellow(`⏭️  Skipped: ${targetPath}`));
							continue;
						}
					}

					// Write file
					await writeRuleFile(content, join(process.cwd(), targetPath));
					console.log(chalk.green(`✓ Installed: ${targetPath}`));
				} catch (error) {
					console.log(chalk.red(`❌ Error processing ${file.path}: ${error}`));
				}
			}

			// Add category to config
			const updatedConfig = addCategory(config, categoryId);
			Object.assign(config, updatedConfig);

			installedRules.push(manifest.id);
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
