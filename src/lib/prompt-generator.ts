import type { Manifest, SkillFile, WorkflowFile } from "src/server/types";

/**
 * Generates a ChatGPT prompt that includes all rule categories, skills, workflows
 * and instructions for ChatGPT to ask questions and output the correct CLI command
 * @param manifests - Array of rule category manifests
 * @param agent - AI agent name (cursor, windsurf, etc.)
 * @param skills - Array of available skills (optional)
 * @param workflows - Array of available workflows (optional)
 * @returns Complete prompt string ready to copy and paste into ChatGPT
 */
export function generateChatGptPrompt(
	manifests: Manifest[],
	agent: string,
	skills: SkillFile[] = [],
	workflows: WorkflowFile[] = [],
): string {
	// Sort manifests alphabetically by id for consistent ordering
	const sortedManifests = [...manifests].sort((a, b) => a.id.localeCompare(b.id));

	// Build introduction
	const introduction = `You are helping a developer select appropriate AI agent rules, skills, and workflows for their project. Your task is to:

1. Ask the developer questions to understand their project's tech stack, framework, and specific needs
2. Based on their answers, select the most relevant rule categories, skills, and workflows from the lists below
3. Output the CLI command with the selected items

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

	// Build skills section if skills are provided
	const skillsSection =
		skills.length > 0
			? `\n\n## Available Skills

${skills.map((skill) => `- **${skill.name}**`).join("\n")}

Skills are specialized procedures that the AI agent can use to help with specific tasks. Select skills that match the developer's workflow and project needs.`
			: "";

	// Build workflows section if workflows are provided
	const workflowsSection =
		workflows.length > 0
			? `\n\n## Available Workflows

${workflows.map((workflow) => `- **${workflow.name}**`).join("\n")}

Workflows are step-by-step procedures for common development tasks. Select workflows that will help the developer with their typical tasks.`
			: "";

	// Build instructions section
	const instructions = `## Instructions

1. **Ask Questions**: Start by asking the developer about their project:
   - What programming languages are they using?
   - What frameworks or libraries are they using?
   - What is the project type (web app, API, library, etc.)?
   - What common tasks do they perform? (testing, deployment, code review, etc.)
   - Any specific requirements or constraints?

2. **Ask About Preferences**: After understanding their project, ask about installation preferences:
   - **Overwrite Strategy**: How should conflicts with existing files be handled?
     - \`prompt\` (default): Ask before overwriting each file
     - \`force\`: Automatically overwrite all existing files
     - \`skip\`: Skip files that already exist

3. **Select Items**: Based on their answers, select the most relevant items:
   - **Categories**: Rule categories that match their tech stack
   - **Skills**: Specialized procedures for their workflow (Note: skills are auto-installed, no flag needed)
   - **Workflows**: Common tasks they'll perform regularly
   
   Only select items that are actually relevant to their project.

4. **Output Command**: Once you've made your selections, output the CLI command in this exact format:

\`\`\`
npx @quanvo99/ai-rules@latest init --agent ${agent} --categories {category1,category2} --workflows {workflow1,workflow2} --overwrite-strategy {strategy}
\`\`\`

Replace the placeholders with the actual IDs/names you selected, separated by commas. 

**Available flags**:
- \`--agent {name}\`: Required. AI agent name
- \`--categories {cat1,cat2}\`: Required. Comma-separated category IDs
- \`--workflows {workflow1,workflow2}\`: Optional. Comma-separated workflow names
- \`--overwrite-strategy {prompt|force|skip}\`: Optional. How to handle file conflicts (default: prompt)

**Note**: Skills are automatically installed for the selected agent and don't need a separate flag.

## Example

If the developer says they're building a Next.js app with TypeScript, doing TDD, needs commit workflows, and wants to skip existing files, you might select:
- Categories: typescript-conventions, react-server-components
- Workflows: commit-plan, review-changes
- Overwrite strategy: skip

And output:
\`\`\`
npx @quanvo99/ai-rules@latest init --agent ${agent} --categories typescript-conventions,react-server-components --workflows commit-plan,review-changes --overwrite-strategy skip
\`\`\`

The test-quality-reviewer skill will be automatically installed since it's available for ${agent}.

Now, let's start! Please tell me about your project.`;

	// Combine all sections
	return `${introduction}

## Available Rule Categories

${categoriesSection}${skillsSection}${workflowsSection}

${instructions}`;
}
