"use client";

import { useId, useState } from "react";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { PendingButton } from "src/components/ui/pending-button";

/**
 * Reviewer login form. Posts the entered secret to `/api/auth`; on success the server sets the
 * session cookie and the form redirects to the review page. On failure it renders an inline error.
 */
export function LoginForm() {
	const [secret, setSecret] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const secretId = useId();

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		const response = await fetch("/api/auth", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ secret }),
		});
		setSubmitting(false);
		if (response.ok) {
			window.location.href = "/kb/review";
			return;
		}
		setError("Incorrect secret. Please try again.");
	}

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold text-foreground">Reviewer Login</h1>
				<p className="text-sm text-muted-foreground">Enter the shared secret to access the review tools.</p>
			</div>
			<div className="space-y-2">
				<Label htmlFor={secretId}>Secret</Label>
				<Input
					id={secretId}
					type="password"
					value={secret}
					onChange={(event) => setSecret(event.target.value)}
					placeholder="AI_RULES_SECRET"
				/>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<PendingButton type="submit" pending={submitting} disabled={secret.length === 0} className="w-full">
				Sign in
			</PendingButton>
		</form>
	);
}
