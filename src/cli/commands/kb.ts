import { readFile } from "node:fs/promises";
import chalk from "chalk";
import { Command } from "commander";
import {
	type KbUpdateFields,
	kbCaptureBlueprint,
	kbCaptureMemory,
	kbCaptureQuestion,
	kbCaptureTil,
	kbDelete,
	kbGet,
	kbSearch,
	kbUpdate,
} from "../lib/api-client";
import { readConfigOrNull } from "../lib/config";
import { resolveWriteScope } from "../lib/write-scope";

/**
 * Reads the workspace's scope tags from `.ai-rules.json` without ever writing a default file.
 * @returns The configured scope list, or an empty array when no config/scope is present
 */
async function workspaceScope(): Promise<string[]> {
	const config = await readConfigOrNull(process.cwd());
	return config?.scope ?? [];
}

/**
 * Reads all of stdin as a UTF-8 string. Returns an empty string when stdin is a TTY (not piped).
 * @returns The piped stdin content, or "" when nothing was piped
 */
async function readStdin(): Promise<string> {
	if (process.stdin.isTTY) return "";
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
	return Buffer.concat(chunks).toString("utf8");
}

/**
 * Resolves a required text field from `--<field>` inline or `--<field>-file <path>`.
 * @param inline - The inline value (if provided)
 * @param file - A path to read the value from (takes precedence over inline)
 * @param label - Field name used in the error message
 * @returns The resolved, non-empty text
 */
async function resolveField(inline: string | undefined, file: string | undefined, label: string): Promise<string> {
	const value = file ? await readFile(file, "utf8") : inline;
	if (!value || value.trim().length === 0) {
		throw new Error(`Missing ${label}: provide --${label} <text> or --${label}-file <path>.`);
	}
	return value;
}

/**
 * Resolves a body field from `--file <path>`, else `--body <text>`, else piped stdin.
 * @param body - Inline body value
 * @param file - Path to read the body from (takes precedence)
 * @returns The resolved, non-empty body
 */
async function resolveBody(body: string | undefined, file: string | undefined): Promise<string> {
	const value = file ? await readFile(file, "utf8") : (body ?? (await readStdin()));
	if (!value || value.trim().length === 0) {
		throw new Error("Missing body: provide --file <path>, --body <text>, or pipe the body via stdin.");
	}
	return value;
}

/**
 * Prints a captured draft's id and a reminder that it is pending human review.
 * @param id - The created draft's id
 */
function reportCaptured(id: string): void {
	console.log(chalk.green(`✅ Captured draft ${id} — pending human review (not yet visible to agents).`));
}

/**
 * Resolves an optional body field for `kb update`. Unlike `resolveBody` (capture-oriented: falls
 * back to stdin, throws on empty), an omitted `--body`/`--body-file` here means "leave the body
 * untouched" — so this never reads stdin and never throws.
 * @param body - Inline body value
 * @param file - Path to read the body from (takes precedence over inline)
 * @returns The resolved body, or `undefined` when neither flag was given
 */
async function resolveOptionalBody(body: string | undefined, file: string | undefined): Promise<string | undefined> {
	if (file) return readFile(file, "utf8");
	return body;
}

/**
 * Resolves the optional scope for `kb update`. Unlike `resolveWriteScope` (which requires one of
 * `--scope`/`--global`), an omitted pair here means "leave scope untouched" — a title/body-only
 * edit must not be forced to restate visibility.
 * @param scope - The `--scope` CSV value (if provided)
 * @param global - Whether `--global` was passed
 * @returns `[]` for `--global`, the parsed CSV tags for `--scope`, or `undefined` when neither was given
 */
function resolveOptionalScope(scope: string | undefined, global: boolean | undefined): string[] | undefined {
	if (scope !== undefined && global) {
		throw new Error("--scope and --global are mutually exclusive — pass one, not both.");
	}
	if (global) return [];
	if (scope === undefined) return undefined;
	const tags = scope
		.split(",")
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);
	if (tags.length === 0) throw new Error("--scope requires at least one non-empty tag.");
	return tags;
}

/** The `kb` command and its subcommands (search/get/capture-*) over the shared knowledge base. */
export const kbCommand = new Command("kb").description("Search and capture entries in the shared knowledge base");

kbCommand
	.command("search <query>")
	.description("Search canonical knowledge scoped to this workspace")
	.option("--type <type>", "Filter by type: question, til, blueprint, or memory")
	.action(async (query: string, options: { type?: string }) => {
		try {
			const hits = await kbSearch(query, await workspaceScope(), options.type);
			if (hits.length === 0) {
				console.log(chalk.yellow("No matching knowledge found."));
				return;
			}
			for (const hit of hits) {
				console.log(
					`${chalk.dim(hit.id)}  ${chalk.cyan(`[${hit.type}]`)}  ${hit.title}  ${chalk.dim(`(${hit.score})`)}`,
				);
			}
			console.log(chalk.dim(`\nUse "npx @quanvo99/ai-rules@latest kb get <id>" to read the full entry.`));
		} catch (error) {
			console.error(chalk.red(`❌ ${error instanceof Error ? error.message : error}`));
			process.exit(1);
		}
	});

kbCommand
	.command("get <id>")
	.description("Print the full body of a canonical knowledge entry by id")
	.action(async (id: string) => {
		try {
			const doc = await kbGet(id);
			if (!doc) {
				console.log(chalk.yellow(`No entry found with id ${id}.`));
				return;
			}
			console.log(chalk.bold(`${doc.title}  ${chalk.dim(`[${doc.type}]`)}`));
			console.log(chalk.dim(`scope: ${doc.scope.join(", ") || "(none)"}\n`));
			console.log(doc.body);
		} catch (error) {
			console.error(chalk.red(`❌ ${error instanceof Error ? error.message : error}`));
			process.exit(1);
		}
	});

kbCommand
	.command("update <id>")
	.description("Edit a knowledge-base entry's title/body/scope by id (requires AI_RULES_SECRET)")
	.option("--title <title>", "New title")
	.option("--body <text>", "New body (or use --body-file)")
	.option("--body-file <path>", "Read the new body from a file")
	.option("--scope <csv>", "New comma-separated scope tags. Mutually exclusive with --global.")
	.option("--global", "Set scope to global (empty scope, visible to every workspace). Mutually exclusive with --scope.")
	.action(
		async (
			id: string,
			options: { title?: string; body?: string; bodyFile?: string; scope?: string; global?: boolean },
		) => {
			try {
				const fields: KbUpdateFields = {};
				if (options.title !== undefined) fields.title = options.title;
				const body = await resolveOptionalBody(options.body, options.bodyFile);
				if (body !== undefined) fields.body = body;
				const scope = resolveOptionalScope(options.scope, options.global);
				if (scope !== undefined) fields.scope = scope;

				if (Object.keys(fields).length === 0) {
					throw new Error("Provide at least one of --title, --body, --body-file, --scope, --global to update.");
				}

				const updated = await kbUpdate(id, fields);
				if (!updated) {
					console.error(chalk.red(`❌ No entry found with id ${id}.`));
					process.exit(1);
					return;
				}
				console.log(chalk.green(`✅ Updated entry ${id}.`));
			} catch (error) {
				console.error(chalk.red(`❌ ${error instanceof Error ? error.message : error}`));
				process.exit(1);
			}
		},
	);

kbCommand
	.command("delete <id>")
	.description("Permanently remove a knowledge-base entry by id, canonical or draft (requires AI_RULES_SECRET)")
	.action(async (id: string) => {
		try {
			const deleted = await kbDelete(id);
			if (!deleted) {
				console.error(chalk.red(`❌ No entry found with id ${id}.`));
				process.exit(1);
				return;
			}
			console.log(chalk.green(`✅ Deleted entry ${id}.`));
		} catch (error) {
			console.error(chalk.red(`❌ ${error instanceof Error ? error.message : error}`));
			process.exit(1);
		}
	});

const capture = kbCommand.command("capture").description("Capture a draft entry (pending human review)");

capture
	.command("question")
	.description("Capture a solved question (problem + resolution)")
	.requiredOption("--title <title>", "Short title for the question")
	.option("--problem <text>", "The problem statement (or use --problem-file)")
	.option("--problem-file <path>", "Read the problem statement from a file")
	.option("--resolution <text>", "The resolution (or use --resolution-file)")
	.option("--resolution-file <path>", "Read the resolution from a file")
	.option("--scope <csv>", "Comma-separated scope tags (e.g., work,client-x). Required unless --global is set.")
	.option(
		"--global",
		"Capture as a global entry (empty scope, visible to every workspace). Mutually exclusive with --scope.",
	)
	.action(
		async (options: {
			title: string;
			problem?: string;
			problemFile?: string;
			resolution?: string;
			resolutionFile?: string;
			scope?: string;
			global?: boolean;
		}) => {
			try {
				const scope = resolveWriteScope({ scope: options.scope, global: options.global });
				const problem = await resolveField(options.problem, options.problemFile, "problem");
				const resolution = await resolveField(options.resolution, options.resolutionFile, "resolution");
				const id = await kbCaptureQuestion({ title: options.title, problem, resolution }, scope);
				reportCaptured(id);
			} catch (error) {
				console.error(chalk.red(`❌ ${error instanceof Error ? error.message : error}`));
				process.exit(1);
			}
		},
	);

capture
	.command("til")
	.description("Capture a Today-I-Learned note")
	.requiredOption("--title <title>", "Short title for the learning")
	.option("--body <text>", "The note body (or use --file / stdin)")
	.option("--file <path>", "Read the note body from a file")
	.option("--scope <csv>", "Comma-separated scope tags (e.g., work,client-x). Required unless --global is set.")
	.option(
		"--global",
		"Capture as a global entry (empty scope, visible to every workspace). Mutually exclusive with --scope.",
	)
	.action(async (options: { title: string; body?: string; file?: string; scope?: string; global?: boolean }) => {
		try {
			const scope = resolveWriteScope({ scope: options.scope, global: options.global });
			const body = await resolveBody(options.body, options.file);
			const id = await kbCaptureTil({ title: options.title, body }, scope);
			reportCaptured(id);
		} catch (error) {
			console.error(chalk.red(`❌ ${error instanceof Error ? error.message : error}`));
			process.exit(1);
		}
	});

capture
	.command("blueprint")
	.description("Capture a reusable solution blueprint")
	.requiredOption("--title <title>", "Short title for the blueprint")
	.option("--body <text>", "The blueprint body (or use --file / stdin)")
	.option("--file <path>", "Read the blueprint body from a file")
	.option("--scope <csv>", "Comma-separated scope tags (e.g., work,client-x). Required unless --global is set.")
	.option(
		"--global",
		"Capture as a global entry (empty scope, visible to every workspace). Mutually exclusive with --scope.",
	)
	.action(async (options: { title: string; body?: string; file?: string; scope?: string; global?: boolean }) => {
		try {
			const scope = resolveWriteScope({ scope: options.scope, global: options.global });
			const body = await resolveBody(options.body, options.file);
			const id = await kbCaptureBlueprint({ title: options.title, body }, scope);
			reportCaptured(id);
		} catch (error) {
			console.error(chalk.red(`❌ ${error instanceof Error ? error.message : error}`));
			process.exit(1);
		}
	});

capture
	.command("memory")
	.description("Capture an always-on memory (must be <=2 lines / <=200 chars)")
	.option("--title <title>", "Optional title (derived from the first line when omitted)")
	.option("--body <text>", "The memory body (or use --file / stdin)")
	.option("--file <path>", "Read the memory body from a file")
	.option("--scope <csv>", "Comma-separated scope tags (e.g., work,client-x). Required unless --global is set.")
	.option(
		"--global",
		"Capture as a global entry (empty scope, visible to every workspace). Mutually exclusive with --scope.",
	)
	.action(async (options: { title?: string; body?: string; file?: string; scope?: string; global?: boolean }) => {
		try {
			const scope = resolveWriteScope({ scope: options.scope, global: options.global });
			const body = await resolveBody(options.body, options.file);
			const input = options.title ? { body, title: options.title } : { body };
			const id = await kbCaptureMemory(input, scope);
			reportCaptured(id);
		} catch (error) {
			console.error(chalk.red(`❌ ${error instanceof Error ? error.message : error}`));
			process.exit(1);
		}
	});
