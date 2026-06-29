"use client";

import { useId, useState } from "react";
import { ScopeChipsEditor } from "src/components/scope-chips-editor.ui";
import { Button } from "src/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "src/components/ui/dialog";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { PendingButton } from "src/components/ui/pending-button";
import { Textarea } from "src/components/ui/textarea";
import {
	usePrivateSkills,
	usePrivateSkillsActions,
	usePrivateSkillsFilter,
	usePrivateSkillsSavePending,
} from "./private-skills-page.state";
import type { PrivateSkillDisplay } from "./private-skills-page.type";
import {
	PrivateSkillCard,
	PrivateSkillGlobalBadge,
	PrivateSkillScopes,
	PrivateSkillScopeTag,
	PrivateSkillsHeader,
	PrivateSkillsList,
} from "./private-skills-page.ui";

/**
 * Reviewer-facing browse screen for private skills. Lists every private skill with its name,
 * originating agent, scope tags, and description, and lets a reviewer edit a skill's title,
 * content, description, and scopes via a dialog that reuses the shared scope-chips editor.
 */
export function PrivateSkillsPageClient() {
	const skills = usePrivateSkills();
	const { showGlobalOnly, toggleGlobalFilter } = usePrivateSkillsFilter();
	const { editSkill } = usePrivateSkillsActions();
	const savePending = usePrivateSkillsSavePending();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editContent, setEditContent] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editScopes, setEditScopes] = useState<string[]>([]);
	const titleId = useId();
	const contentId = useId();
	const descriptionId = useId();

	function openEdit(skill: PrivateSkillDisplay) {
		setEditingId(skill.id);
		setEditName(skill.name);
		setEditContent(skill.content);
		setEditDescription(skill.description ?? "");
		setEditScopes(skill.scopes);
	}

	async function saveEdit() {
		if (editingId === null) return;
		await editSkill(editingId, editName, editContent, editDescription, editScopes);
		setEditingId(null);
	}

	return (
		<div className="space-y-6">
			<PrivateSkillsHeader>
				<h1 className="text-3xl font-bold text-foreground">Private Skills</h1>
				<p className="text-muted-foreground">Every private skill across all workspace scopes.</p>
				<Button variant="outline" onClick={toggleGlobalFilter}>
					{showGlobalOnly ? "Show all" : "Show global only"}
				</Button>
			</PrivateSkillsHeader>

			{skills.length === 0 ? (
				<p className="text-muted-foreground">No private skills found.</p>
			) : (
				<PrivateSkillsList>
					{skills.map((skill) => (
						<PrivateSkillCard key={skill.id}>
							<div className="flex items-center justify-between">
								<h2 className="font-semibold text-foreground">{skill.name}</h2>
								<span className="text-xs text-muted-foreground">{skill.agent}</span>
							</div>
							{skill.description && <p className="text-sm text-muted-foreground">{skill.description}</p>}
							<PrivateSkillScopes>
								{skill.scopes.length === 0 ? (
									<PrivateSkillGlobalBadge />
								) : (
									skill.scopes.map((scope) => <PrivateSkillScopeTag key={scope}>{scope}</PrivateSkillScopeTag>)
								)}
							</PrivateSkillScopes>
							<Button variant="outline" onClick={() => openEdit(skill)}>
								Edit
							</Button>
						</PrivateSkillCard>
					))}
				</PrivateSkillsList>
			)}

			<Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Private Skill</DialogTitle>
						<DialogDescription>Change the skill's title, content, description, and scopes.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={titleId}>Title</Label>
							<Input id={titleId} value={editName} onChange={(e) => setEditName(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label htmlFor={contentId}>Content</Label>
							<Textarea id={contentId} rows={8} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label htmlFor={descriptionId}>Description</Label>
							<Input id={descriptionId} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
						</div>
						<ScopeChipsEditor label="Scopes" value={editScopes} onChange={setEditScopes} />
					</div>
					<DialogFooter>
						<PendingButton
							pending={savePending}
							onClick={saveEdit}
							disabled={editName.trim().length === 0 || editContent.trim().length === 0}
						>
							Save
						</PendingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
