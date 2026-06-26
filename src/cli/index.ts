#!/usr/bin/env node

import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { addCommand } from "./commands/add";
import { initCommand } from "./commands/init";
import { kbCommand } from "./commands/kb";
import { pullCommand } from "./commands/pull";
import { syncCommand } from "./commands/sync";
import { uploadCommand } from "./commands/upload";

const program = new Command();

program
	.name("ai-rules")
	.description(
		"A command-line tool that helps developers pull curated AI agent rules from a centralized repository into their projects",
	)
	.version("0.2.4");

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
	.command("sync")
	.description("Force-install the full available catalog for a project (or every project under a root with --all)")
	.option("--all", "Discover and sync every project with an .ai-rules.json under --root")
	.option("--root <dir>", "Root directory to scan in --all mode", join(homedir(), "Documents", "git-repos"))
	.action(async (options) => {
		try {
			const summary = await syncCommand({ all: options.all, root: options.root });
			// In bulk mode, a non-zero exit signals that at least one project failed.
			if (summary && summary.failed > 0) process.exit(1);
		} catch (error) {
			console.error(chalk.red(`❌ Error: ${error}`));
			process.exit(1);
		}
	});

program
	.command("add")
	.description("Add categories, skills, or workflows to an existing project")
	.option("--categories <list>", "Comma-separated list of category IDs to add (use 'all' for all)")
	.option("--skills <list>", "Comma-separated list of skill IDs to add (use 'all' for all)")
	.option("--workflows <list>", "Comma-separated list of workflow IDs to add (use 'all' for all)")
	.option(
		"--overwrite-strategy <strategy>",
		"Conflict resolution strategy: prompt (ask), force (overwrite), or skip (keep existing)",
		"prompt",
	)
	.action(async (options) => {
		try {
			const parsedOptions = {
				categories: options.categories
					? typeof options.categories === "string"
						? options.categories.split(",").map((c: string) => c.trim())
						: undefined
					: undefined,
				skills: options.skills
					? typeof options.skills === "string"
						? options.skills.split(",").map((s: string) => s.trim())
						: undefined
					: undefined,
				workflows: options.workflows
					? typeof options.workflows === "string"
						? options.workflows.split(",").map((w: string) => w.trim())
						: undefined
					: undefined,
				overwriteStrategy: options.overwriteStrategy,
			};

			await addCommand(parsedOptions);
		} catch (error) {
			console.error(chalk.red(`❌ Error: ${error}`));
			process.exit(1);
		}
	});

program
	.command("upload <skillPath>")
	.description("Upload a local skill directory to the API as a private, scoped skill (requires AI_RULES_SECRET)")
	.requiredOption("--agent <name>", "AI agent name the skill belongs to (e.g., claude-code)")
	.option("--scope <csv>", "Comma-separated list of scope tags (e.g., work,client-x). Required unless --global is set.")
	.option(
		"--global",
		"Upload as a global skill (empty scope, visible to every workspace). Mutually exclusive with --scope.",
	)
	.action(async (skillPath, options) => {
		try {
			await uploadCommand({ agent: options.agent, scope: options.scope, global: options.global, skillPath });
		} catch (error) {
			console.error(chalk.red(`❌ Error: ${error}`));
			process.exit(1);
		}
	});

program.addCommand(kbCommand);

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
