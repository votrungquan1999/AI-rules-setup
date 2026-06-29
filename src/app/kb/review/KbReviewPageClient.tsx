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
import { useKbReviewActions, useKbReviewDrafts, useKbReviewFilter, useKbReviewPendingDraftId } from "./kb-review.state";
import type { KbDocDraft } from "./kb-review.type";
import {
	KbGlobalBadge,
	KbReviewActionsRow,
	KbReviewCard,
	KbReviewHeader,
	KbReviewList,
	KbScopeRow,
	KbScopeTag,
} from "./kb-review.ui";

/**
 * Review screen orchestrator. Lists drafts and wires approve/reject/edit actions to the KB API via
 * domain hooks. The edit flow opens a dialog pre-filled with the draft's title/body/scopes; saving
 * calls the PATCH endpoint and keeps the draft (status stays draft) with its new text and scopes,
 * then closes.
 */
export function KbReviewPageClient() {
	const drafts = useKbReviewDrafts();
	const { showGlobalOnly, toggleGlobalFilter } = useKbReviewFilter();
	const { approveDraft, rejectDraft, editDraft, approveAllDrafts } = useKbReviewActions();
	const pendingDraftId = useKbReviewPendingDraftId();
	const [editing, setEditing] = useState<KbDocDraft | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editBody, setEditBody] = useState("");
	const [editScopes, setEditScopes] = useState<string[]>([]);
	const [confirmingApproveAll, setConfirmingApproveAll] = useState(false);
	const [approvingAll, setApprovingAll] = useState(false);
	const [savePending, setSavePending] = useState(false);
	const titleId = useId();
	const bodyId = useId();

	function openEdit(d: KbDocDraft) {
		setEditing(d);
		setEditTitle(d.title);
		setEditBody(d.body);
		setEditScopes(d.scope);
	}

	async function saveEdit() {
		if (!editing) return;
		setSavePending(true);
		try {
			const saved = await editDraft(editing.id, editTitle, editBody, editScopes);
			// Keep the dialog open on failure so the reviewer can retry without losing their edits.
			if (saved) setEditing(null);
		} finally {
			setSavePending(false);
		}
	}

	async function confirmApproveAll() {
		setApprovingAll(true);
		try {
			await approveAllDrafts(drafts);
		} finally {
			setApprovingAll(false);
			setConfirmingApproveAll(false);
		}
	}

	return (
		<div className="space-y-6">
			<KbReviewHeader>
				<h1 className="text-3xl font-bold text-foreground">Review Drafts</h1>
				<p className="text-muted-foreground">Approve, reject, or edit captured knowledge before it goes live.</p>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" onClick={toggleGlobalFilter}>
						{showGlobalOnly ? "Show all" : "Show global only"}
					</Button>
					<PendingButton
						onClick={() => setConfirmingApproveAll(true)}
						pending={approvingAll}
						disabled={drafts.length === 0}
					>
						{`Approve all (${drafts.length})`}
					</PendingButton>
				</div>
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
								<PendingButton pending={pendingDraftId === d.id} onClick={() => approveDraft(d.id)}>
									Approve
								</PendingButton>
								<Button variant="outline" onClick={() => openEdit(d)}>
									Edit
								</Button>
								<PendingButton
									variant="destructive"
									pending={pendingDraftId === d.id}
									onClick={() => rejectDraft(d.id)}
								>
									Reject
								</PendingButton>
							</KbReviewActionsRow>
						</KbReviewCard>
					))}
				</KbReviewList>
			)}

			<Dialog
				open={confirmingApproveAll}
				onOpenChange={(open) => !open && !approvingAll && setConfirmingApproveAll(false)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Approve all visible drafts?</DialogTitle>
						<DialogDescription>
							{drafts.length === 1
								? "This will promote 1 draft to canonical."
								: `This will promote ${drafts.length} drafts to canonical in a single request.`}{" "}
							Drafts hidden by the current filter are not affected.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmingApproveAll(false)} disabled={approvingAll}>
							Cancel
						</Button>
						<PendingButton onClick={confirmApproveAll} pending={approvingAll}>
							Approve all
						</PendingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>

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
						<ScopeChipsEditor label="Scopes" value={editScopes} onChange={setEditScopes} />
					</div>
					<DialogFooter>
						<PendingButton pending={savePending} onClick={saveEdit} disabled={editBody.trim().length === 0}>
							Save
						</PendingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
