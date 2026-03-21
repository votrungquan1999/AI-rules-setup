import { render } from "@testing-library/react";
import { SelectRulesPageClient } from "src/app/select-rules/SelectRulesPageClient";
import { ManifestsProvider } from "src/lib/manifests.state";
import { SearchProvider } from "src/lib/search.state";
import { SelectionProvider } from "src/lib/selection.state";
import type { Manifest, Preset, RulesData, SkillFile, WorkflowFile } from "src/server/types";

/**
 * Shared test factories for select-rules integration tests.
 */

export function createManifest(id: string, description: string): Manifest {
	return {
		id,
		category: id,
		tags: [id],
		description,
		whenToUse: `When using ${id}`,
		files: [],
	};
}

export function createSkill(name: string): SkillFile {
	return {
		name,
		description: `${name} skill description`,
		content: `---\nname: ${name}\ndescription: ${name} skill description\n---\n# ${name}`,
	};
}

export function createWorkflow(name: string): WorkflowFile {
	return {
		name,
		description: `${name} workflow description`,
		content: `---\ndescription: ${name} workflow description\n---\n# ${name} workflow`,
	};
}

/**
 * Renders the SelectRulesPageClient with all required providers.
 * - With `defaultAgent`: skips landing page (agent pre-selected)
 * - Without `defaultAgent`: shows landing page
 */
interface RenderOptions {
	defaultAgent?: string;
	presets?: Record<string, Preset[]>;
}

export function renderSelectRulesPage(rulesData: RulesData, options: RenderOptions = {}) {
	const agents = Object.keys(rulesData.agents);
	const { defaultAgent, presets } = options;
	return render(
		<SelectionProvider {...(defaultAgent ? { defaultAgent } : {})}>
			<ManifestsProvider rulesData={rulesData} questions={[]} agents={agents} {...(presets ? { presets } : {})}>
				<SearchProvider>
					<SelectRulesPageClient />
				</SearchProvider>
			</ManifestsProvider>
		</SelectionProvider>,
	);
}
