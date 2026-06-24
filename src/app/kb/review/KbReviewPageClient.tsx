"use client";

import { useId, useState } from "react";
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
import { useKbReviewActions, useKbReviewDrafts, useKbReviewFilter } from "./kb-review.state";
import type { KbDocDraft } from "./kb-review.type";
import {
	KbGlobalBadge,
	KbReviewActionsRow,
	KbReviewCard,
	KbReviewHeader,
	KbReviewLayout,
	KbReviewList,
	KbScopeRow,
	KbScopeTag,
} from "./kb-review.ui";

/**
 * Review screen orchestrator. Lists drafts and wires approve/reject/edit actions to the KB API via
 * domain hooks. The edit flow opens a dialog pre-filled with the draft's title/body; saving calls
 * the PATCH endpoint and keeps the draft (status stays draft) with its new text, then closes.
 */
export function KbReviewPageClient() {
	const drafts = useKbReviewDrafts();
	const { showGlobalOnly, toggleGlobalFilter } = useKbReviewFilter();
	const { approveDraft, rejectDraft, editDraft } = useKbReviewActions();
	const [editing, setEditing] = useState<KbDocDraft | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editBody, setEditBody] = useState("");
	const titleId = useId();
	const bodyId = useId();

	function openEdit(d: KbDocDraft) {
		setEditing(d);
		setEditTitle(d.title);
		setEditBody(d.body);
	}

	async function saveEdit() {
		if (!editing) return;
		await editDraft(editing.id, editTitle, editBody);
		setEditing(null);
	}

	return (
		<KbReviewLayout>
			<KbReviewHeader>
				<h1 className="text-3xl font-bold text-foreground">Review Drafts</h1>
				<p className="text-muted-foreground">Approve, reject, or edit captured knowledge before it goes live.</p>
				<Button variant="outline" onClick={toggleGlobalFilter}>
					{showGlobalOnly ? "Show all" : "Show global only"}
				</Button>
			</KbReviewHeader>

			{drafts.length === 0 ? (
				<p className="text-muted-foreground">No drafts awaiting review.</p>
			) : (
				<KbReviewList>
					{drafts.map((d) => (
						<KbReviewCard key={d.id}>
							<div className="space-y-1">
								<span className="text-xs font-medium uppercase text-muted-foreground">{d.type}</span>
								<h2 className="font-semibold text-foreground">{d.title}</h2>
								<p className="whitespace-pre-wrap text-sm text-muted-foreground">{d.body}</p>
								<KbScopeRow>
									{d.scope.length === 0 ? <KbGlobalBadge /> : d.scope.map((s) => <KbScopeTag key={s}>{s}</KbScopeTag>)}
								</KbScopeRow>
							</div>
							<KbReviewActionsRow>
								<Button onClick={() => approveDraft(d.id)}>Approve</Button>
								<Button variant="outline" onClick={() => openEdit(d)}>
									Edit
								</Button>
								<Button variant="destructive" onClick={() => rejectDraft(d.id)}>
									Reject
								</Button>
							</KbReviewActionsRow>
						</KbReviewCard>
					))}
				</KbReviewList>
			)}

			<Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Draft</DialogTitle>
						<DialogDescription>Refine the captured knowledge before approving it.</DialogDescription>
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
					</div>
					<DialogFooter>
						<Button onClick={saveEdit} disabled={editBody.trim().length === 0}>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</KbReviewLayout>
	);
}
