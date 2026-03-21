"use client";

import { RulesList } from "src/components/rules-list";
import { SkillsList } from "src/components/skills-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { WorkflowsList } from "src/components/workflows-list";
import { useManifests, useSkills, useWorkflows } from "src/lib/manifests.state";

/**
 * Tabbed content layout for agent displays.
 * Shows tabs for Skills, Workflows, and Rules — hiding tabs that have no content.
 * Rules tab is always shown as all agents have rules.
 */
export function ContentTabs() {
	const skills = useSkills();
	const workflows = useWorkflows();
	const manifests = useManifests();

	const hasSkills = skills.length > 0;
	const hasWorkflows = workflows.length > 0;

	// Default to skills tab if available, otherwise rules
	const defaultTab = hasSkills ? "skills" : "rules";

	return (
		<Tabs data-testid="content-tabs" defaultValue={defaultTab}>
			<TabsList>
				{hasSkills && <TabsTrigger value="skills">Skills ({skills.length})</TabsTrigger>}
				{hasWorkflows && <TabsTrigger value="workflows">Workflows ({workflows.length})</TabsTrigger>}
				<TabsTrigger value="rules">Rules ({manifests.length})</TabsTrigger>
			</TabsList>

			{hasSkills && (
				<TabsContent value="skills">
					<SkillsList />
				</TabsContent>
			)}
			{hasWorkflows && (
				<TabsContent value="workflows">
					<WorkflowsList />
				</TabsContent>
			)}
			<TabsContent value="rules">
				<RulesList />
			</TabsContent>
		</Tabs>
	);
}
