/**
 * Prompt builder for question generation
 * Reads rule content and builds structured prompts for LLM
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Manifest } from "../../server/types";

/**
 * Rule content structure for prompt building
 */
interface RuleContent {
	/** Rule manifest metadata */
	manifest: Manifest;
	/** Content of all rule files */
	files: Array<{
		path: string;
		content: string;
	}>;
}

/**
 * Reads rule content from the repository
 * @param rulePath - The path to the rule directory (e.g., 'rules/cursor/brainstorming')
 * @returns Rule content with manifest and files
 */
export function readRuleContent(rulePath: string): RuleContent {
	// Resolve the rule directory path
	const ruleDir = rulePath.startsWith("/") ? rulePath : join(process.cwd(), rulePath);

	if (!existsSync(ruleDir)) {
		throw new Error(`Rule directory not found: ${ruleDir}`);
	}

	// Read manifest
	const manifestPath = join(ruleDir, "manifest.json");
	if (!existsSync(manifestPath)) {
		throw new Error(`Manifest not found: ${manifestPath}`);
	}

	const manifest: Manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

	// Read all rule files
	const files = manifest.files.map((file) => {
		const filePath = join(ruleDir, file.path);
		if (!existsSync(filePath)) {
			throw new Error(`Rule file not found: ${filePath}`);
		}

		const content = readFileSync(filePath, "utf-8");
		return {
			path: file.path,
			content,
		};
	});

	return { manifest, files };
}

/**
 * Builds context string from rule metadata and content
 * @param ruleContent - Rule content structure
 * @returns Formatted context string for LLM
 */
export function buildRuleContext(ruleContent: RuleContent): string {
	const { manifest, files } = ruleContent;

	const context = `
Rule ID: ${manifest.id}
Category: ${manifest.category}
Tags: ${manifest.tags.join(", ")}
Description: ${manifest.description}

Rule Content:
${files.map((file) => `--- ${file.path} ---\n${file.content}`).join("\n\n")}
`;

	return context.trim();
}

/**
 * System prompt for question generation
 * Includes instructions, schema, and examples
 */
const SYSTEM_PROMPT = `You are a question generation assistant for an AI rules library.

Your task: Generate 3-5 questions that identify if developers want/need help from this rule.

Context: Questions build context for fuzzy search rule discovery. User describes project → answers questions → keywords added to context → context searches rules.

Question Types:
1. yes-no: Binary questions. Must include "keywords" array (added to search context if user answers yes)
2. choice: Multiple choice. Must include "options" array with text and keywords for each
3. open-ended: Free text. Full answer added to search context.

All questions MUST include:
- "id": Unique identifier in kebab-case
- "text": Clear, concise question text
- "type": One of: yes-no, choice, open-ended
- "tags": Array of relevant search tags (technology names, concepts, patterns)

Requirements:
- ALWAYS lead with 1-2 high-level need/intent questions
- High-level questions should directly ask about wanting/needing help (e.g., "Do you want rules to help with X?")
- Then follow with specific usage or technical questions
- Questions can ask about current usage OR needs - both add keywords to context
- For core technologies (e.g., TypeScript, React, Next.js, Node.js), the FIRST question MUST be a usage-detection yes/no (e.g., "Are you using TypeScript?") when the rule clearly targets that technology
- Focus on what will help identify if this rule solves their problems
- Tags should match common terms developers use
- Keywords should include aliases and variations
- Keep questions clear and unambiguous

Return valid JSON matching this schema:
{
  "questions": [
    {
      "id": "string (kebab-case, unique)",
      "text": "string (the question)",
      "type": "yes-no | choice | open-ended",
      "tags": ["string", "..."],
      "keywords": ["string", "..."], // for yes-no only
      "options": [ // for choice only
        { "text": "string", "keywords": ["string", "..."] }
      ]
    }
  ]
}

Examples:

Example for a TypeScript rule (usage detection MUST be first):
{
  "id": "uses-typescript",
  "text": "Are you using TypeScript?",
  "type": "yes-no",
  "tags": ["typescript", "language", "type-system"],
  "keywords": ["typescript", "ts"]
}

Example for a React hooks rule (usage detection):
{
  "id": "uses-react-hooks",
  "text": "Are you using React hooks in your project?",
  "type": "yes-no",
  "tags": ["react", "hooks", "frontend"],
  "keywords": ["react", "hooks", "useState", "useEffect"]
}

Example for a CSS framework choice:
{
  "id": "css-framework",
  "text": "What CSS framework are you using?",
  "type": "choice",
  "tags": ["css", "styling", "framework"],
  "options": [
    { "text": "Tailwind CSS", "keywords": ["tailwind", "tailwindcss"] },
    { "text": "styled-components", "keywords": ["styled-components"] },
    { "text": "CSS Modules", "keywords": ["css-modules"] }
  ]
}

Example for a brainstorming rule (high-level need):
{
  "id": "wants-brainstorming-help",
  "text": "Do you want rules to help you brainstorm and document ideas methodically?",
  "type": "yes-no",
  "tags": ["brainstorming", "problem-solving", "documentation"],
  "keywords": ["brainstorming", "structured-thinking", "documentation", "problem-definition"]
}

Example for open-ended (exploration):
{
  "id": "project-challenges",
  "text": "What are the main challenges you face in your development process?",
  "type": "open-ended",
  "tags": ["challenges", "problems", "workflow"]
}

Example for a React Server Components rule (usage detection):
{
  "id": "uses-nextjs-app-router",
  "text": "Are you using Next.js App Router?",
  "type": "yes-no",
  "tags": ["nextjs", "react", "app-router", "server-components"],
  "keywords": ["nextjs", "app-router", "server-components", "next.js"]
}

Example for a React Server Components rule (architecture choice):
{
  "id": "component-architecture",
  "text": "What component architecture are you using?",
  "type": "choice",
  "tags": ["react", "architecture", "components"],
  "options": [
    { "text": "Server Components with App Router", "keywords": ["server-components", "app-router", "rsc"] },
    { "text": "Client Components only", "keywords": ["client-components", "spa"] },
    { "text": "Pages Router", "keywords": ["pages-router", "getServerSideProps"] }
  ]
}

Example for a Server Components rule (need for guidance):
{
  "id": "needs-server-component-patterns",
  "text": "Do you need help with Server Component patterns and best practices?",
  "type": "yes-no",
  "tags": ["react", "server-components", "patterns", "best-practices"],
  "keywords": ["server-components", "client-server-separation", "data-fetching", "composition"]
}`;

/**
 * Builds the complete prompt for LLM question generation
 * @param rulePath - The path to the rule directory
 * @returns Complete prompt string
 */
export function buildQuestionPrompt(rulePath: string): string {
	const ruleContent = readRuleContent(rulePath);
	const context = buildRuleContext(ruleContent);

	return `${SYSTEM_PROMPT}

Rule to analyze:
${context}

Generate 3-5 relevant questions for this rule. Return only valid JSON.`;
}
