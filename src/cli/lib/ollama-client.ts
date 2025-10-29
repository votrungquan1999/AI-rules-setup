/**
 * Ollama LLM client for generating questions
 * Handles connection, API calls, and response parsing
 */

/**
 * Configuration for Ollama client
 */
interface OllamaConfig {
	/** Ollama server URL */
	baseUrl: string;
	/** Default model to use */
	defaultModel: string;
	/** Request timeout in milliseconds */
	timeout: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OllamaConfig = {
	baseUrl: "http://localhost:11434",
	defaultModel: process.env.OLLAMA_MODEL || "llama3.2",
	timeout: parseInt(process.env.OLLAMA_TIMEOUT || "180000", 10), // 3 minutes default, configurable via env
};

/**
 * Ollama API request body structure
 */
interface OllamaRequest {
	model: string;
	prompt: string;
	stream: boolean;
	options?: {
		temperature?: number;
		max_tokens?: number;
		top_p?: number;
		frequency_penalty?: number;
	};
}

/**
 * Ollama API response structure
 */
interface OllamaResponse {
	model: string;
	created_at: string;
	response: string;
	done: boolean;
}

/**
 * Error class for Ollama-specific errors
 */
export class OllamaError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
	) {
		super(message);
		this.name = "OllamaError";
	}
}

/**
 * Checks if Ollama server is running and accessible
 * @param config - Ollama configuration
 * @returns Promise that resolves to true if server is accessible, false on any error
 */
export async function checkOllamaHealth(config: OllamaConfig = DEFAULT_CONFIG): Promise<boolean> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), config.timeout);

	try {
		const response = await fetch(`${config.baseUrl}/api/tags`, {
			method: "GET",
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response.ok;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === "AbortError") {
			return false; // Timeout occurred
		}
		return false; // Any other error means server is not accessible
	}
}

/**
 * Calls Ollama API to generate text
 * @param prompt - The prompt to send to the LLM
 * @param model - Model to use (defaults to config default)
 * @param config - Ollama configuration
 * @returns Promise that resolves to the generated text
 */
export async function callOllama(
	prompt: string,
	model?: string,
	config: OllamaConfig = DEFAULT_CONFIG,
): Promise<string> {
	const modelToUse = model || config.defaultModel;

	const requestBody: OllamaRequest = {
		model: modelToUse,
		prompt,
		stream: false,
		options: {
			temperature: 0.7,
			max_tokens: 1500,
			top_p: 0.9,
			frequency_penalty: 0.5,
		},
	};

	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort();
	}, config.timeout);

	let response: Response;
	try {
		response = await fetch(`${config.baseUrl}/api/generate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
			signal: controller.signal,
		});
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === "AbortError") {
			throw new OllamaError(`Request timeout after ${config.timeout}ms`);
		}
		throw new OllamaError(`Request failed: ${error instanceof Error ? error.message : "Unknown error"}`);
	}

	clearTimeout(timeoutId);

	if (!response.ok) {
		throw new OllamaError(`HTTP ${response.status}: ${response.statusText}`, response.status);
	}

	try {
		const data: OllamaResponse = await response.json();
		return data.response;
	} catch (error) {
		throw new OllamaError(`Failed to parse JSON response: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Extracts JSON from LLM response text
 * Handles cases where LLM returns pure JSON or wraps it in markdown code blocks
 *
 * @example
 * // Pure JSON object
 * extractJsonFromResponse('{"questions": [{"id": "1", "text": "test"}]}')
 *
 * // Pure JSON array
 * extractJsonFromResponse('[{"id": "1", "text": "test"}]')
 *
 * // JSON in markdown code block
 * extractJsonFromResponse('```json\n{"questions": []}\n```')
 *
 * // JSON with extra text
 * extractJsonFromResponse('Here is the JSON: {"id": "1"}')
 *
 * @param response - Raw response from LLM
 * @returns Extracted JSON string or null if not found
 */
export function extractJsonFromResponse(response: string): string | null {
	// Trim whitespace first
	const trimmed = response.trim();

	// Case 1: Response is pure JSON (starts and ends with {})
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
		try {
			// Try to parse to validate it's valid JSON
			JSON.parse(trimmed);
			return trimmed;
		} catch {
			// Not valid JSON, continue to other methods
		}
	}

	// Case 2: Response is pure JSON array (starts and ends with [])
	if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
		try {
			// Try to parse to validate it's valid JSON
			JSON.parse(trimmed);
			return trimmed;
		} catch {
			// Not valid JSON, continue to other methods
		}
	}

	// Case 3: JSON wrapped in markdown code blocks
	const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
	if (codeBlockMatch) {
		return codeBlockMatch[1] ?? null;
	}

	// Case 4: JSON array wrapped in markdown code blocks
	const arrayCodeBlockMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
	if (arrayCodeBlockMatch) {
		return arrayCodeBlockMatch[1] ?? null;
	}

	// Case 5: Find JSON object anywhere in the text (fallback)
	const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
	if (jsonObjectMatch) {
		return jsonObjectMatch[0] ?? null;
	}

	// Case 6: Find JSON array anywhere in the text (fallback)
	const jsonArrayMatch = response.match(/\[[\s\S]*\]/);
	if (jsonArrayMatch) {
		return jsonArrayMatch[0] ?? null;
	}

	return null;
}

/**
 * Generates questions using Ollama with error handling
 * @param prompt - The prompt to send to the LLM
 * @param model - Model to use (optional)
 * @returns Promise that resolves to the generated JSON string
 */
export async function generateQuestionsWithOllama(prompt: string, model?: string): Promise<string> {
	const isHealthy = await checkOllamaHealth();
	if (!isHealthy) {
		throw new OllamaError(
			"Ollama server is not running or not accessible at http://localhost:11434\n" +
				"Please start Ollama and ensure the server is running.",
		);
	}

	const response = await callOllama(prompt, model);
	const jsonString = extractJsonFromResponse(response);

	if (!jsonString) {
		throw new OllamaError(
			"LLM response does not contain valid JSON.\n" +
				"Response received:\n" +
				response.substring(0, 500) +
				(response.length > 500 ? "..." : ""),
		);
	}

	return jsonString;
}
