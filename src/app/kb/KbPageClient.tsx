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
import { Textarea } from "src/components/ui/textarea";
import type { KbDoc } from "src/server/types";
import { useKbBrowseActions, useKbBrowseEditDialog, useKbBrowseEntries } from "./kb-browse.state";
import {
	KbListCard,
	KbListContainer,
	KbListGlobalBadge,
	KbListHeader,
	KbListLayout,
	KbListScopeRow,
	KbListScopeTag,
} from "./kb-list.ui";

/**
 * Browse-screen orchestrator for canonical KB entries. Lists approved entries and wires an Edit
 * affordance on each: opening a dialog pre-filled with the entry's title/body/scope, and saving via
 * the PATCH endpoint (which keeps the entry canonical). The card reflects saved changes immediately.
 */
export function KbPageClient() {
	const entries = useKbBrowseEntries();
	const { editingEntry, openEdit, closeEdit } = useKbBrowseEditDialog();
	const { editEntry } = useKbBrowseActions();
	const [editTitle, setEditTitle] = useState("");
	const [editBody, setEditBody] = useState("");
	const [editScopes, setEditScopes] = useState<string[]>([]);
	const titleId = useId();
	const bodyId = useId();

	function handleOpenEdit(entry: KbDoc) {
		setEditTitle(entry.title);
		setEditBody(entry.body);
		setEditScopes(entry.scope);
		openEdit(entry.id);
	}

	async function saveEdit() {
		if (!editingEntry) return;
		await editEntry(editingEntry.id, editTitle, editBody, editScopes);
	}

	return (
		<KbListLayout>
			<KbListHeader>
				<h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
				<p className="text-muted-foreground">
					Approved canonical entries returned to agents. {entries.length} {entries.length === 1 ? "entry" : "entries"}.
				</p>
			</KbListHeader>

			{entries.length === 0 ? (
				<p className="text-muted-foreground">No canonical entries yet.</p>
			) : (
				<KbListContainer>
					{entries.map((entry) => (
						<KbListCard key={entry.id}>
							<div className="space-y-1">
								<span className="text-xs font-medium uppercase text-muted-foreground">{entry.type}</span>
								<h2 className="font-semibold text-foreground">{entry.title}</h2>
								<p className="whitespace-pre-wrap text-sm text-muted-foreground">{entry.body}</p>
								<KbListScopeRow>
									{entry.scope.length === 0 ? (
										<KbListGlobalBadge />
									) : (
										entry.scope.map((s) => <KbListScopeTag key={s}>{s}</KbListScopeTag>)
									)}
								</KbListScopeRow>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" onClick={() => handleOpenEdit(entry)}>
									Edit
								</Button>
							</div>
						</KbListCard>
					))}
				</KbListContainer>
			)}

			<Dialog open={editingEntry !== null} onOpenChange={(open) => !open && closeEdit()}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Entry</DialogTitle>
						<DialogDescription>Refine an approved entry — it stays approved after saving.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={titleId}>Title</Label>
							<Input id={titleId} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label htmlFor={bodyId}>Body</Label>
							<Textarea id={bodyId} rows={8} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
						</div>
						<ScopeChipsEditor label="Scopes" value={editScopes} onChange={setEditScopes} />
					</div>
					<DialogFooter>
						<Button onClick={saveEdit} disabled={editBody.trim().length === 0}>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</KbListLayout>
	);
}
