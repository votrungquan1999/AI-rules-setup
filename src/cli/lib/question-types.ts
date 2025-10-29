/**
 * TypeScript types for question generation system
 * Based on the brainstorming documentation requirements
 */

/**
 * Base fields common to all question types
 */
interface BaseQuestion {
	/** Unique identifier in kebab-case */
	id: string;
	/** The question text to display to users */
	text: string;
	/** Tags for fuzzy search matching */
	tags: string[];
}

/**
 * Yes/No question type
 * Must include keywords array that gets added to context if user answers yes
 */
export interface YesNoQuestion extends BaseQuestion {
	type: "yes-no";
	/** Keywords added to search context if user answers yes */
	keywords: string[];
}

/**
 * Choice question type
 * Must include options array with text and keywords for each option
 */
export interface ChoiceQuestion extends BaseQuestion {
	type: "choice";
	/** Available choices with their associated keywords */
	options: Array<{
		/** Display text for the choice */
		text: string;
		/** Keywords added to search context if this option is selected */
		keywords: string[];
	}>;
}

/**
 * Open-ended question type
 * Full user answer text is added to search context
 */
export interface OpenEndedQuestion extends BaseQuestion {
	type: "open-ended";
	// No additional fields needed
}

/**
 * Union type for all question types
 * Uses discriminated union based on the 'type' field
 */
export type Question = YesNoQuestion | ChoiceQuestion | OpenEndedQuestion;

/**
 * Response format containing array of questions
 * This is what gets written to suggested_questions/<rule-id>.json
 */
export interface QuestionResponse {
	/** Array of generated questions for this rule */
	questions: Question[];
}

/**
 * Type guard to check if a question is a Yes/No question
 */
export function isYesNoQuestion(question: Question): question is YesNoQuestion {
	return question.type === "yes-no";
}

/**
 * Type guard to check if a question is a Choice question
 */
export function isChoiceQuestion(question: Question): question is ChoiceQuestion {
	return question.type === "choice";
}

/**
 * Type guard to check if a question is an Open-ended question
 */
export function isOpenEndedQuestion(question: Question): question is OpenEndedQuestion {
	return question.type === "open-ended";
}
