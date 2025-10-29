import type { Question, QuestionFile } from "src/lib/question-types";
import { getDatabase } from "./database";
import type { QuestionDocument } from "./types";

/**
 * GitHub file interface for API response
 */
interface GitHubFile {
	name: string;
	path: string;
	type: "file" | "dir";
	download_url?: string;
}

/**
 * Fetches all stored questions from MongoDB cache
 * @returns Array of question documents or null if no questions found
 */
export async function findAllStoredQuestions(): Promise<Question[]> {
	const db = await getDatabase();
	const collection = db.collection<QuestionDocument>("questions");

	const questions = await collection.find({}).toArray();

	if (questions.length === 0) {
		return [];
	}

	return questions.map((question) => ({
		id: question.id,
		text: question.text,
		type: question.type,
		tags: question.tags,
		keywords: question.keywords || [],
		options: question.options || [],
	}));
}

/**
 * Fetches questions from GitHub repository
 * Reads all JSON files from the questions/ folder
 * @returns Array of questions from all question files
 */
export async function fetchQuestionsFromGitHub(): Promise<Question[]> {
	try {
		const response = await fetch("https://api.github.com/repos/quanvo/AI-rules-repo/contents/questions", {
			headers: {
				Accept: "application/vnd.github.v3+json",
			},
		});

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
		}

		const files = await response.json();

		// Filter for JSON files only
		const jsonFiles = files.filter((file: GitHubFile) => file.name.endsWith(".json"));

		const allQuestions: Question[] = [];

		// Fetch content for each JSON file
		for (const file of jsonFiles) {
			try {
				const fileResponse = await fetch(file.download_url);
				if (!fileResponse.ok) continue;

				const content = await fileResponse.text();
				const questionFile: QuestionFile = JSON.parse(content);

				// Add sourceFile to each question
				const questionsWithSource = questionFile.questions.map((question) => ({
					...question,
					sourceFile: file.name,
				}));

				allQuestions.push(...questionsWithSource);
			} catch (fileError) {
				console.error(`Error fetching questions from ${file.name}:`, fileError);
			}
		}

		return allQuestions;
	} catch (error) {
		console.error("Error fetching questions from GitHub:", error);
		throw error;
	}
}

/**
 * Caches questions in MongoDB as individual documents
 * Each question becomes its own document for easier querying
 * @param questions - Array of questions to cache
 */
export async function cacheQuestionsInDatabase(questions: Question[]): Promise<void> {
	const db = await getDatabase();
	const collection = db.collection<QuestionDocument>("questions");

	const now = new Date();

	// Convert questions to documents
	const documents: QuestionDocument[] = questions.map((question) => ({
		id: question.id,
		text: question.text,
		type: question.type,
		tags: question.tags,
		keywords: question.type === "yes-no" ? question.keywords || [] : [],
		options: question.type === "choice" ? question.options || [] : [],
		sourceFile: (question as Question & { sourceFile?: string }).sourceFile || "unknown",
		lastFetched: now,
		createdAt: now,
		updatedAt: now,
	}));

	// Use upsert to handle both new and existing questions
	for (const doc of documents) {
		await collection.replaceOne({ id: doc.id }, doc, { upsert: true });
	}

	console.log(`Cached ${documents.length} questions in database`);
}

/**
 * Clears all questions from the database cache
 * Used for re-syncing questions from GitHub
 */
export async function clearQuestionsCache(): Promise<void> {
	const db = await getDatabase();
	const collection = db.collection<QuestionDocument>("questions");

	const result = await collection.deleteMany({});
	console.log(`Cleared ${result.deletedCount} questions from cache`);
}
