import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import chalk from "chalk";
import { collectSupportingFiles } from "../../app/api/lib/local-fetcher";
import type { SkillFile } from "../../server/types";
import { uploadPrivateSkill } from "../lib/api-client";

interface UploadOptions {
	agent: string;
	scope: string;
	skillPath: string;
}

/**
 * Reads a local skill directory and uploads it as a private skill via the API.
 * The skill directory must contain a SKILL.md file; additional files become supportingFiles.
 * Requires `AI_RULES_SECRET` env var to be set so the API accepts the upload.
 */
export async function uploadCommand(options: UploadOptions): Promise<void> {
	const scopes = options.scope
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	if (scopes.length === 0) {
		console.error(chalk.red("❌ --scope is required and must contain at least one non-empty tag"));
		process.exit(1);
	}

	const skillDir = resolve(options.skillPath);
	const skillName = basename(skillDir);
	const skillMdPath = join(skillDir, "SKILL.md");
	const content = await readFile(skillMdPath, "utf-8");
	const supportingFiles = await collectSupportingFiles(skillDir, skillDir);

	const skill: SkillFile = {
		name: skillName,
		content,
	};
	if (supportingFiles.length > 0) skill.supportingFiles = supportingFiles;

	const result = await uploadPrivateSkill(options.agent, skill, scopes);
	if (!result.success) {
		console.error(chalk.red(`❌ Upload failed (HTTP ${result.status}): ${result.error ?? "unknown error"}`));
		process.exit(1);
	}
	console.log(
		chalk.green(
			`✅ Uploaded private skill '${skillName}' for agent '${options.agent}' under scopes [${scopes.join(", ")}]`,
		),
	);
}
