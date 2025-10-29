/**
 * Base question interface with common fields
 */
export interface BaseQuestion {
	/** Unique identifier in kebab-case */
	id: string;
	/** The question text */
	text: string;
	/** Array of tags for fuzzy search matching */
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
 * Choice question type with multiple options
 * Selected option's keywords are added to context
 */
export interface ChoiceQuestion extends BaseQuestion {
	type: "choice";
	/** Array of choice options with text and keywords */
	options: Array<{
		text: string;
		keywords: string[];
	}>;
}

/**
 * Open-ended question type
 * Full user answer text is added to context
 */
export interface OpenEndedQuestion extends BaseQuestion {
	type: "open-ended";
}

/**
 * Union type for all question types
 */
export type Question = YesNoQuestion | ChoiceQuestion | OpenEndedQuestion;

/**
 * Question file structure as stored in JSON files
 * Contains array of questions for a specific rule or category
 */
export interface QuestionFile {
	questions: Question[];
}

/**
 * Response type for question generation (used by CLI)
 * Wrapper around QuestionFile for API responses
 */
export type QuestionResponse = QuestionFile;

/**
 * Question answer types for context state management
 */
export type QuestionAnswer =
	| { type: "yes-no"; value: boolean }
	| { type: "choice"; value: number } // option index
	| { type: "open-ended"; value: string };
