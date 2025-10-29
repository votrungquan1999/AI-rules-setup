#!/usr/bin/env tsx

/**
 * Question generation script for AI rules
 * Generates questions using local LLM (Ollama) and validates with Zod
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import type { QuestionResponse } from "src/lib/question-types";
import { generateQuestionsWithOllama, OllamaError } from "../lib/ollama-client";
import { buildQuestionPrompt } from "../lib/question-prompt";
import { validateQuestionResponse } from "../lib/question-schema";

/**
 * Ensures the suggested_questions directory exists
 */
function ensureSuggestedQuestionsDir(): void {
	const dir = join(process.cwd(), "suggested_questions");
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
		console.log(chalk.gray("Created suggested_questions directory"));
	}
}

/**
 * Writes questions to file with pretty formatting
 * @param questions - Questions to write
 * @param ruleId - Rule ID for filename
 * @param customOutput - Custom output path (optional)
 */
function writeQuestionsFile(questions: QuestionResponse, ruleId: string, customOutput?: string): void {
	const filename = customOutput || `${ruleId}.json`;
	const filepath = customOutput ? join(process.cwd(), filename) : join(process.cwd(), "suggested_questions", filename);

	const jsonContent = JSON.stringify(questions, null, 2);
	writeFileSync(filepath, jsonContent, "utf-8");

	console.log(chalk.green(`✅ Questions written to: ${filepath}`));
}

/**
 * Main function for question generation
 */
async function generateQuestions(rulePath: string, options: { model: string; output?: string }): Promise<void> {
	// Extract rule ID from path for display and filename
	const ruleId = rulePath.split("/").pop() || rulePath;

	console.log(chalk.blue(`🔍 Generating questions for rule: ${ruleId}`));
	console.log(chalk.gray(`Using model: ${options.model}`));

	try {
		// Build prompt from rule content
		console.log(chalk.gray("📖 Reading rule content..."));
		const prompt = buildQuestionPrompt(rulePath);

		// Generate questions using Ollama
		console.log(chalk.gray("🤖 Calling Ollama LLM..."));
		const jsonResponse = await generateQuestionsWithOllama(prompt, options.model);

		// Parse and validate response
		console.log(chalk.gray("✅ Validating response..."));
		const parseResult = JSON.parse(jsonResponse);
		const validationResult = validateQuestionResponse(parseResult);

		// TODO: Add a way to retry the generation
		if (validationResult.success === false) {
			console.error(chalk.red("❌ Validation failed:"));
			console.error(chalk.red(validationResult.error));
			console.log(chalk.yellow("\nRaw LLM response:"));
			console.log(chalk.gray(jsonResponse));
			process.exit(1);
		}

		// TypeScript now knows validationResult is success case
		const validatedQuestions = validationResult.data;

		// Ensure output directory exists
		ensureSuggestedQuestionsDir();

		// Write questions to file
		writeQuestionsFile(validatedQuestions, ruleId, options.output);

		// Show summary
		const questionCount = validatedQuestions.questions.length;
		console.log(chalk.green(`\n🎉 Successfully generated ${questionCount} questions for '${ruleId}'`));

		// Show question preview
		console.log(chalk.blue("\n📋 Generated questions:"));
		validatedQuestions.questions.forEach((q, index) => {
			console.log(chalk.gray(`${index + 1}. [${q.type}] ${q.text}`));
		});

		console.log(chalk.yellow("\n💡 Next steps:"));
		console.log(chalk.gray("1. Review the generated questions"));
		console.log(chalk.gray("2. Edit if needed"));
		console.log(chalk.gray("3. Move to questions/ folder when ready"));
	} catch (error) {
		if (error instanceof OllamaError) {
			console.error(chalk.red(`❌ Ollama Error: ${error.message}`));

			if (error.message.includes("not running")) {
				console.log(chalk.yellow("\n💡 To fix this:"));
				console.log(chalk.gray("1. Install Ollama: https://ollama.ai"));
				console.log(chalk.gray("2. Start Ollama server"));
				console.log(chalk.gray("3. Pull a model: ollama pull llama3.2"));
			}
		} else {
			console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`));
		}

		process.exit(1);
	}
}

// Create CLI program using Commander.js
const program = new Command();

program
	.name("generate-questions")
	.description("Generate questions for AI rules using local LLM (Ollama)")
	.argument("<rule-path>", "Path to rule directory (e.g., 'rules/cursor/brainstorming')")
	.argument("[model]", "Model name (alternative to --model flag)", "")
	.option("-m, --model <model>", "Ollama model to use")
	.option("-o, --output <file>", "Custom output filename")
	.action(async (rulePath: string, modelArg: string, options: { model?: string; output?: string }) => {
		// Use option model, then fall back to positional model arg
		const model = options.model || modelArg || "llama3.2";

		// Call with merged options including model
		await generateQuestions(rulePath, { ...options, model });
	});

// Parse arguments and run
program.parse();
