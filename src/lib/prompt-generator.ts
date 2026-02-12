import type { Manifest } from "src/server/types";

/**
 * Generates a ChatGPT prompt that includes all rule categories and instructions
 * for ChatGPT to ask questions and output the correct CLI command
 * @param manifests - Array of rule category manifests
 * @param agent - AI agent name (cursor, windsurf, etc.)
 * @param workflows - Array of workflow names (optional)
 * @returns Complete prompt string ready to copy and paste into ChatGPT
 */
export function generateChatGptPrompt(manifests: Manifest[], agent: string, workflows: string[] = []): string {
	// Sort manifests alphabetically by id for consistent ordering
	const sortedManifests = [...manifests].sort((a, b) => a.id.localeCompare(b.id));

	// Build introduction
	const introduction = `You are helping a developer select appropriate AI agent rules for their project. Your task is to:

1. Ask the developer questions to understand their project's tech stack, framework, and specific needs
2. Based on their answers, select the most relevant rule categories from the list below
3. Output the CLI command with the selected categories

The developer will paste this command into their terminal to install the rules.`;

	// Build categories section
	const categoriesSection = sortedManifests
		.map((manifest) => {
			const tagsList = manifest.tags.join(", ");
			return `**${manifest.id}** (Category: ${manifest.category})
- Description: ${manifest.description}
- When to use: ${manifest.whenToUse}
- Tags: ${tagsList}`;
		})
		.join("\n\n");

	// Build workflows section if workflows are provided
	const workflowsSection =
		workflows.length > 0 ? `\n\n## Available Workflows\n\n${workflows.map((name) => `- ${name}`).join("\n")}` : "";

	// Build instructions section
	const instructions = `## Instructions

1. **Ask Questions**: Start by asking the developer about their project:
   - What programming languages are they using?
   - What frameworks or libraries are they using?
   - What is the project type (web app, API, library, etc.)?
   - Any specific requirements or constraints?

2. **Select Categories**: Based on their answers, select the most relevant rule categories from the list above. Only select categories that are actually relevant to their project.

3. **Output Command**: Once you've selected the categories, output the CLI command in this exact format:

\`\`\`
npx @quanvo99/ai-rules@latest init --agent ${agent} --categories {category1,category2,category3}
\`\`\`

Replace {category1,category2,category3} with the actual category IDs you selected, separated by commas.

## Example

If the developer says they're building a Next.js app with TypeScript and Tailwind CSS, you might select:
- typescript-conventions
- react-server-components
- tailwind-basics

And output:
\`\`\`
npx @quanvo99/ai-rules@latest init --agent ${agent} --categories typescript-conventions,react-server-components,tailwind-basics
\`\`\`

Now, let's start! Please tell me about your project.`;

	// Combine all sections
	return `${introduction}

## Available Rule Categories

${categoriesSection}${workflowsSection}

${instructions}`;
}
