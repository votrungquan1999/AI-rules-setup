#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { pullCommand } from "./commands/pull";

const program = new Command();

program
	.name("ai-rules")
	.description(
		"A command-line tool that helps developers pull curated AI agent rules from a centralized repository into their projects",
	)
	.version("0.1.0");

program
	.command("init")
	.description("Initialize AI rules for the current project")
	.option("--agent <name>", "Specify the AI agent (cursor, windsurf, etc.)")
	.option("--categories <list>", "Comma-separated list of category IDs to install")
	.option("--no-categories", "Skip category installation entirely")
	.option("--workflows <list>", "Comma-separated list of workflow IDs to install")
	.option("--no-workflows", "Skip workflow installation entirely")
	.option("--skills <list>", "Comma-separated list of skill IDs to install")
	.option("--no-skills", "Skip skill installation entirely")
	.option(
		"--overwrite-strategy <strategy>",
		"Conflict resolution strategy: prompt (ask), force (overwrite), or skip (keep existing)",
		"prompt",
	)
	.action(async (options) => {
		try {
			// Parse categories from comma-separated string
			const parsedOptions = {
				agent: options.agent,
				categories: options.categories
					? typeof options.categories === "string"
						? options.categories.split(",").map((c: string) => c.trim())
						: undefined
					: undefined,
				workflows: options.workflows
					? typeof options.workflows === "string"
						? options.workflows.split(",").map((w: string) => w.trim())
						: undefined
					: undefined,
				skills: options.skills
					? typeof options.skills === "string"
						? options.skills.split(",").map((s: string) => s.trim())
						: undefined
					: undefined,
				noCategories: options.categories === false,
				noSkills: options.skills === false,
				noWorkflows: options.workflows === false,
				overwriteStrategy: options.overwriteStrategy,
			};

			// Validate overwrite strategy
			if (parsedOptions.overwriteStrategy && !["prompt", "force", "skip"].includes(parsedOptions.overwriteStrategy)) {
				console.error(chalk.red(`❌ Invalid overwrite strategy: ${parsedOptions.overwriteStrategy}`));
				console.log(chalk.yellow("Valid options: prompt, force, skip"));
				process.exit(1);
			}

			await initCommand(parsedOptions);
		} catch (error) {
			console.error(chalk.red(`❌ Error: ${error}`));
			process.exit(1);
		}
	});

program
	.command("pull")
	.description("Pull latest versions of all configured rules, skills, and workflows")
	.option(
		"--overwrite-strategy <strategy>",
		"Conflict resolution strategy: force (overwrite), skip (keep existing), or prompt (ask)",
		"force",
	)
	.action(async (options) => {
		try {
			await pullCommand(options);
		} catch (error) {
			console.error(chalk.red(`❌ Error: ${error}`));
			process.exit(1);
		}
	});

program
	.command("help")
	.description("Show help information")
	.action(() => {
		program.help();
	});

// Handle unknown commands
program.on("command:*", () => {
	console.error(chalk.red(`❌ Unknown command: ${program.args.join(" ")}`));
	console.log(chalk.blue("Use --help to see available commands"));
	process.exit(1);
});

// Handle errors
program.on("error", (error) => {
	console.error(chalk.red(`❌ Error: ${error.message}`));
	process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
	program.help();
}
