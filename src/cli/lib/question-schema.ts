/**
 * Zod schemas for validating question generation responses
 * Provides type-safe validation with detailed error messages
 */

import type { Question, QuestionResponse } from "src/lib/question-types";
import { z } from "zod";

/**
 * Base schema with common fields for all question types
 */
const BaseQuestionSchema = z.object({
	id: z
		.string()
		.regex(/^[a-z0-9-]+$/, "ID must be in kebab-case (lowercase letters, numbers, and hyphens only)")
		.min(1, "ID cannot be empty"),
	text: z
		.string()
		.min(10, "Question text must be at least 10 characters")
		.max(200, "Question text must be at most 200 characters"),
	tags: z.array(z.string().min(1, "Tags cannot be empty")).min(1, "At least one tag is required"),
});

/**
 * Yes/No question schema
 * Requires keywords array for context building
 */
const YesNoQuestionSchema = BaseQuestionSchema.extend({
	type: z.literal("yes-no"),
	keywords: z
		.array(z.string().min(1, "Keywords cannot be empty"))
		.min(1, "At least one keyword is required for yes-no questions"),
});

/**
 * Choice question schema
 * Requires options array with at least 2 choices
 */
const ChoiceQuestionSchema = BaseQuestionSchema.extend({
	type: z.literal("choice"),
	options: z
		.array(
			z.object({
				text: z.string().min(1, "Option text cannot be empty"),
				keywords: z
					.array(z.string().min(1, "Keywords cannot be empty"))
					.min(1, "At least one keyword is required per option"),
			}),
		)
		.min(2, "Choice questions must have at least 2 options"),
});

/**
 * Open-ended question schema
 * No additional fields required
 */
const OpenEndedQuestionSchema = BaseQuestionSchema.extend({
	type: z.literal("open-ended"),
});

/**
 * Discriminated union schema for all question types
 * Automatically validates based on the 'type' field
 */
export const QuestionSchema = z.discriminatedUnion("type", [
	YesNoQuestionSchema,
	ChoiceQuestionSchema,
	OpenEndedQuestionSchema,
]);

/**
 * Schema for the complete response containing questions array
 */
export const QuestionResponseSchema = z.object({
	questions: z
		.array(QuestionSchema)
		.min(1, "At least one question is required")
		.max(10, "Maximum 10 questions allowed per rule"),
});

/**
 * Validates a question response and returns typed result
 * @param data - Raw data to validate
 * @returns Success result with typed data or error details
 */
export function validateQuestionResponse(data: unknown):
	| {
			success: true;
			data: QuestionResponse;
	  }
	| {
			success: false;
			error: string;
			details?: z.ZodError;
	  } {
	try {
		const result = QuestionResponseSchema.parse(data);
		return { success: true, data: result };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = (error as z.ZodError).issues
				.map((err) => {
					const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
					return `${path}${err.message}`;
				})
				.join("\n");

			return {
				success: false,
				error: `Validation failed:\n${errorMessages}`,
				details: error,
			};
		}

		return {
			success: false,
			error: `Unknown validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

/**
 * Validates a single question
 * @param data - Raw data to validate
 * @returns Success result with typed question or error details
 */
export function validateQuestion(data: unknown):
	| {
			success: true;
			data: Question;
	  }
	| {
			success: false;
			error: string;
			details?: z.ZodError;
	  } {
	try {
		const result = QuestionSchema.parse(data);
		return { success: true, data: result };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = (error as z.ZodError).issues
				.map((err) => {
					const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
					return `${path}${err.message}`;
				})
				.join("\n");

			return {
				success: false,
				error: `Question validation failed:\n${errorMessages}`,
				details: error,
			};
		}

		return {
			success: false,
			error: `Unknown validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}
