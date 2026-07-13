import { readFile } from "node:fs/promises";
import chalk from "chalk";
import { Command } from "commander";
import { type SkillUpdateFields, skillDelete, skillList, skillUpdate } from "../lib/api-client";
import { uploadCommand } from "./upload";

/** The `skill` command and its subcommands (upload/...) over private, scoped skills. */
export const skillCommand = new Command("skill").description("Manage private, scoped skills");

skillCommand
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

skillCommand
	.command("update <id>")
	.description("Edit a private skill's name/content/description/scope by id (requires AI_RULES_SECRET)")
	.option("--name <name>", "New skill name")
	.option("--content <text>", "New skill content")
	.option("--content-file <path>", "Read new skill content from a file")
	.option("--description <text>", "New description (pass an empty string to clear it)")
	.option("--scope <csv>", "New comma-separated scope tags. Mutually exclusive with --global.")
	.option("--global", "Set scope to global (empty scope, visible to every workspace). Mutually exclusive with --scope.")
	.action(
		async (
			id: string,
			options: {
				name?: string;
				content?: string;
				contentFile?: string;
				description?: string;
				scope?: string;
				global?: boolean;
			},
		) => {
			try {
				if (options.scope !== undefined && options.global) {
					throw new Error("--scope and --global are mutually exclusive — pass one, not both.");
				}

				const fields: SkillUpdateFields = {};
				if (options.name !== undefined) fields.name = options.name;
				if (options.contentFile !== undefined) fields.content = await readFile(options.contentFile, "utf8");
				else if (options.content !== undefined) fields.content = options.content;
				if (options.description !== undefined) fields.description = options.description;
				if (options.global) fields.scopes = [];
				else if (options.scope !== undefined) {
					const tags = options.scope
						.split(",")
						.map((tag) => tag.trim())
						.filter((tag) => tag.length > 0);
					if (tags.length === 0) throw new Error("--scope requires at least one non-empty tag.");
					fields.scopes = tags;
				}

				if (Object.keys(fields).length === 0) {
					throw new Error(
						"Provide at least one of --name, --content, --content-file, --description, --scope, --global to update.",
					);
				}

				const result = await skillUpdate(id, fields);
				if (!result.success) {
					console.error(chalk.red(`❌ Update failed (HTTP ${result.status}): ${result.error ?? "unknown error"}`));
					process.exit(1);
					return;
				}
				console.log(chalk.green(`✅ Updated private skill ${id}.`));
			} catch (error) {
				console.error(chalk.red(`❌ Error: ${error}`));
				process.exit(1);
			}
		},
	);

skillCommand
	.command("delete <id>")
	.description("Permanently remove a private skill by id (requires AI_RULES_SECRET)")
	.action(async (id: string) => {
		try {
			const result = await skillDelete(id);
			if (!result.success) {
				console.error(chalk.red(`❌ Delete failed (HTTP ${result.status}): ${result.error ?? "unknown error"}`));
				process.exit(1);
				return;
			}
			console.log(chalk.green(`✅ Deleted private skill ${id}.`));
		} catch (error) {
			console.error(chalk.red(`❌ Error: ${error}`));
			process.exit(1);
		}
	});

skillCommand
	.command("list")
	.description("List all private skills across every scope (id, name, agent, scopes)")
	.action(async () => {
		try {
			const result = await skillList();
			if (!result.success || !result.data) {
				console.error(
					chalk.red(`❌ Failed to list skills (HTTP ${result.status}): ${result.error ?? "unknown error"}`),
				);
				process.exit(1);
				return;
			}
			if (result.data.length === 0) {
				console.log(chalk.yellow("No private skills found."));
				return;
			}
			for (const skill of result.data) {
				const scopeLabel = skill.scopes.length > 0 ? skill.scopes.join(", ") : "global";
				console.log(
					`${chalk.dim(skill.id)}  ${skill.name}  ${chalk.cyan(`[${skill.agent}]`)}  ${chalk.dim(`(${scopeLabel})`)}`,
				);
			}
		} catch (error) {
			console.error(chalk.red(`❌ Error: ${error}`));
			process.exit(1);
		}
	});
